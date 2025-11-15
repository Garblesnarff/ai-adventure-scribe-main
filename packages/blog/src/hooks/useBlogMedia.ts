import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BlogMediaAsset } from '@/types/blog';

import {
  BLOG_MEDIA_BUCKET,
  BLOG_MEDIA_PREFIX,
  buildMediaPublicUrl,
  deleteBlogMedia,
  listBlogMedia,
  requestSignedUpload,
  uploadWithSignedUrl,
} from '@/services/blog/blog-service';

export const BLOG_MEDIA_QUERY_KEY = 'blog-media';

interface UploadInput {
  file: File | Blob;
  filename?: string;
  contentType?: string;
  bucket?: string;
  prefix?: string;
}

export function useBlogMedia(prefix: string = BLOG_MEDIA_PREFIX, bucket: string = BLOG_MEDIA_BUCKET) {
  return useQuery<BlogMediaAsset[]>({
    queryKey: [BLOG_MEDIA_QUERY_KEY, bucket, prefix],
    queryFn: () => listBlogMedia(prefix, bucket),
    staleTime: 1000 * 20,
  });
}

export function useUploadBlogMedia(prefix: string = BLOG_MEDIA_PREFIX, bucket: string = BLOG_MEDIA_BUCKET) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, filename, contentType, bucket: customBucket, prefix: customPrefix }: UploadInput) => {
      const targetBucket = customBucket || bucket;
      const targetPrefix = customPrefix || prefix;
      const finalFilename = filename || (file instanceof File ? file.name : `asset-${Date.now()}`);
      const type = contentType || (file instanceof File ? file.type : 'application/octet-stream');
      const signed = await requestSignedUpload({
        filename: `${targetPrefix}/${finalFilename}`,
        contentType: type,
        bucket: targetBucket,
      });

      await uploadWithSignedUrl(signed.signedUrl, file, type || 'application/octet-stream');

      const asset: BlogMediaAsset = {
        id: signed.path,
        path: signed.path,
        bucket: signed.bucket,
        publicUrl: buildMediaPublicUrl(signed.path, signed.bucket),
        name: finalFilename,
        mimeType: type,
        size: file instanceof File ? file.size : null,
        createdAt: new Date().toISOString(),
      };

      return { asset, bucket: targetBucket, prefix: targetPrefix };
    },
    onSuccess: ({ asset, bucket: resolvedBucket, prefix: resolvedPrefix }) => {
      queryClient.setQueryData<BlogMediaAsset[] | undefined>([BLOG_MEDIA_QUERY_KEY, resolvedBucket, resolvedPrefix], (old) =>
        old ? [asset, ...old] : [asset],
      );
      queryClient.invalidateQueries({ queryKey: [BLOG_MEDIA_QUERY_KEY, resolvedBucket, resolvedPrefix] });
    },
  });
}

export function useDeleteBlogMedia(prefix: string = BLOG_MEDIA_PREFIX, bucket: string = BLOG_MEDIA_BUCKET) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, bucket: targetBucket }: { path: string; bucket?: string }) =>
      deleteBlogMedia(path, targetBucket || bucket),
    onMutate: async ({ path, bucket: targetBucket }) => {
      const resolvedBucket = targetBucket || bucket;
      await queryClient.cancelQueries({ queryKey: [BLOG_MEDIA_QUERY_KEY, resolvedBucket, prefix] });
      const previous = queryClient.getQueryData<BlogMediaAsset[]>([BLOG_MEDIA_QUERY_KEY, resolvedBucket, prefix]);
      queryClient.setQueryData<BlogMediaAsset[]>([BLOG_MEDIA_QUERY_KEY, resolvedBucket, prefix], (old) =>
        old?.filter((asset) => asset.path !== path) ?? [],
      );
      return { previous, resolvedBucket };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([BLOG_MEDIA_QUERY_KEY, context.resolvedBucket ?? bucket, prefix], context.previous);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      queryClient.invalidateQueries({
        queryKey: [BLOG_MEDIA_QUERY_KEY, context?.resolvedBucket ?? bucket, prefix],
      });
    },
  });
}
