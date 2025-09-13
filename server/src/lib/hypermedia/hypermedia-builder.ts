/**
 * Hypermedia Builder for HATEOAS Support
 * 
 * Implements Hypermedia as the Engine of Application State (HATEOAS) following
 * the HAL (Hypertext Application Language) specification for REST APIs.
 */

import { Request } from 'express';
import { PaginationOptions } from '../rest/base-resource';

export interface Link {
  href: string;
  title?: string;
  type?: string;
  method?: string;
  templated?: boolean;
  deprecation?: string;
  profile?: string;
  hreflang?: string;
}

export interface HALLinks {
  [rel: string]: Link | Link[];
}

export interface EmbeddedResource {
  [rel: string]: any | any[];
}

export interface HALResource {
  _links: HALLinks;
  _embedded?: EmbeddedResource;
  [key: string]: any;
}

export class HypermediaBuilder {
  private resourcePath: string;
  private baseUrl?: string;

  constructor(resourcePath: string) {
    this.resourcePath = resourcePath;
  }

  /**
   * Build hypermedia links for a collection response
   */
  public buildCollectionLinks(
    req: Request,
    pagination: PaginationOptions,
    totalCount: number
  ): HALLinks {
    const baseUrl = this.getBaseUrl(req);
    const links: HALLinks = {};

    // Self link
    links.self = {
      href: this.buildCollectionUrl(baseUrl, req.query),
      title: 'Current collection'
    };

    // First link
    if (pagination.page && pagination.page > 1) {
      const firstQuery = { ...req.query, page: '1' };
      delete firstQuery.cursor;
      links.first = {
        href: this.buildCollectionUrl(baseUrl, firstQuery),
        title: 'First page'
      };
    }

    // Previous link
    if (pagination.page && pagination.page > 1) {
      const prevQuery = { ...req.query, page: (pagination.page - 1).toString() };
      delete prevQuery.cursor;
      links.prev = {
        href: this.buildCollectionUrl(baseUrl, prevQuery),
        title: 'Previous page'
      };
    }

    // Next link
    const limit = pagination.limit || 20;
    const totalPages = Math.ceil(totalCount / limit);
    if (pagination.page && pagination.page < totalPages) {
      const nextQuery = { ...req.query, page: (pagination.page + 1).toString() };
      delete nextQuery.cursor;
      links.next = {
        href: this.buildCollectionUrl(baseUrl, nextQuery),
        title: 'Next page'
      };
    }

    // Last link
    if (pagination.page && pagination.page < totalPages) {
      const lastQuery = { ...req.query, page: totalPages.toString() };
      delete lastQuery.cursor;
      links.last = {
        href: this.buildCollectionUrl(baseUrl, lastQuery),
        title: 'Last page'
      };
    }

    // Template links for operations
    links.create = {
      href: `${baseUrl}${this.resourcePath}`,
      method: 'POST',
      type: 'application/json',
      title: 'Create new resource'
    };

    // Search template
    links.search = {
      href: `${baseUrl}${this.resourcePath}{?q,limit,offset,sort,fields}`,
      templated: true,
      title: 'Search resources'
    };

    return links;
  }

  /**
   * Build hypermedia links for an individual resource
   */
  public buildResourceLinks(resource: any, req: Request): HALLinks {
    const baseUrl = this.getBaseUrl(req);
    const resourceId = resource.id || resource._id;
    const resourceUrl = `${baseUrl}${this.resourcePath}/${resourceId}`;

    const links: HALLinks = {};

    // Self link
    links.self = {
      href: resourceUrl,
      title: 'This resource'
    };

    // Collection link
    links.collection = {
      href: `${baseUrl}${this.resourcePath}`,
      title: 'Parent collection'
    };

    // Edit link
    links.edit = {
      href: resourceUrl,
      method: 'PUT',
      type: 'application/json',
      title: 'Update this resource'
    };

    // Partial edit link
    links['edit-form'] = {
      href: resourceUrl,
      method: 'PATCH',
      type: 'application/json',
      title: 'Partially update this resource'
    };

    // Delete link
    links.delete = {
      href: resourceUrl,
      method: 'DELETE',
      title: 'Delete this resource'
    };

    // Add resource-specific links based on type
    this.addResourceSpecificLinks(links, resource, baseUrl, req);

    return links;
  }

  /**
   * Add resource-specific hypermedia links based on the resource type and relationships
   */
  private addResourceSpecificLinks(
    links: HALLinks,
    resource: any,
    baseUrl: string,
    req: Request
  ): void {
    const resourceType = this.getResourceTypeFromPath();

    switch (resourceType) {
      case 'conversations':
        this.addConversationLinks(links, resource, baseUrl);
        break;
      case 'campaigns':
        this.addCampaignLinks(links, resource, baseUrl);
        break;
      case 'characters':
        this.addCharacterLinks(links, resource, baseUrl);
        break;
      case 'memories':
        this.addMemoryLinks(links, resource, baseUrl);
        break;
      case 'audio-synthesis':
        this.addAudioSynthesisLinks(links, resource, baseUrl);
        break;
      case 'rules':
        this.addRulesLinks(links, resource, baseUrl);
        break;
    }
  }

  private addConversationLinks(links: HALLinks, resource: any, baseUrl: string): void {
    // Messages in conversation
    links.messages = {
      href: `${baseUrl}/api/v3/conversations/${resource.id}/messages`,
      title: 'Messages in this conversation'
    };

    // Add message to conversation
    links['add-message'] = {
      href: `${baseUrl}/api/v3/conversations/${resource.id}/messages`,
      method: 'POST',
      type: 'application/json',
      title: 'Add message to conversation'
    };

    // Related campaign
    if (resource.campaign_id) {
      links.campaign = {
        href: `${baseUrl}/api/v3/campaigns/${resource.campaign_id}`,
        title: 'Related campaign'
      };
    }

    // Participants
    links.participants = {
      href: `${baseUrl}/api/v3/conversations/${resource.id}/participants`,
      title: 'Conversation participants'
    };

    // Audio synthesis for messages
    links['synthesize-audio'] = {
      href: `${baseUrl}/api/v3/audio-synthesis`,
      method: 'POST',
      type: 'application/json',
      title: 'Synthesize audio for messages'
    };
  }

  private addCampaignLinks(links: HALLinks, resource: any, baseUrl: string): void {
    // Characters in campaign
    links.characters = {
      href: `${baseUrl}/api/v3/campaigns/${resource.id}/characters`,
      title: 'Characters in this campaign'
    };

    // Sessions in campaign
    links.sessions = {
      href: `${baseUrl}/api/v3/campaigns/${resource.id}/sessions`,
      title: 'Sessions in this campaign'
    };

    // Campaign conversations
    links.conversations = {
      href: `${baseUrl}/api/v3/conversations?campaign_id=${resource.id}`,
      title: 'Campaign conversations'
    };

    // Campaign memories
    links.memories = {
      href: `${baseUrl}/api/v3/memories?campaign_id=${resource.id}`,
      title: 'Campaign memories'
    };

    // Generate new session
    links['generate-session'] = {
      href: `${baseUrl}/api/v3/campaigns/${resource.id}/sessions`,
      method: 'POST',
      type: 'application/json',
      title: 'Generate new session'
    };

    // Campaign rules
    links.rules = {
      href: `${baseUrl}/api/v3/rules?campaign_id=${resource.id}`,
      title: 'Campaign-specific rules'
    };
  }

  private addCharacterLinks(links: HALLinks, resource: any, baseUrl: string): void {
    // Character sheet
    links.sheet = {
      href: `${baseUrl}/api/v3/characters/${resource.id}/sheet`,
      title: 'Character sheet details'
    };

    // Equipment
    links.equipment = {
      href: `${baseUrl}/api/v3/characters/${resource.id}/equipment`,
      title: 'Character equipment'
    };

    // Spells (if applicable)
    if (resource.class && ['wizard', 'sorcerer', 'warlock', 'cleric', 'druid', 'bard'].includes(resource.class.toLowerCase())) {
      links.spells = {
        href: `${baseUrl}/api/v3/characters/${resource.id}/spells`,
        title: 'Character spells'
      };
    }

    // Campaign
    if (resource.campaign_id) {
      links.campaign = {
        href: `${baseUrl}/api/v3/campaigns/${resource.campaign_id}`,
        title: 'Character campaign'
      };
    }

    // Level up
    links['level-up'] = {
      href: `${baseUrl}/api/v3/characters/${resource.id}/level-up`,
      method: 'POST',
      type: 'application/json',
      title: 'Level up character'
    };

    // Generate backstory
    links['generate-backstory'] = {
      href: `${baseUrl}/api/v3/characters/${resource.id}/generate-backstory`,
      method: 'POST',
      type: 'application/json',
      title: 'Generate character backstory'
    };
  }

  private addMemoryLinks(links: HALLinks, resource: any, baseUrl: string): void {
    // Related memories
    links.related = {
      href: `${baseUrl}/api/v3/memories/search?similar_to=${resource.id}`,
      title: 'Related memories'
    };

    // Campaign
    if (resource.campaign_id) {
      links.campaign = {
        href: `${baseUrl}/api/v3/campaigns/${resource.campaign_id}`,
        title: 'Related campaign'
      };
    }

    // Search memories
    links.search = {
      href: `${baseUrl}/api/v3/memories/search{?q,embedding,limit}`,
      templated: true,
      title: 'Search memories'
    };
  }

  private addAudioSynthesisLinks(links: HALLinks, resource: any, baseUrl: string): void {
    // Download audio
    if (resource.audio_url) {
      links.download = {
        href: resource.audio_url,
        type: 'audio/mpeg',
        title: 'Download audio file'
      };
    }

    // Re-synthesize
    links.regenerate = {
      href: `${baseUrl}/api/v3/audio-synthesis/${resource.id}/regenerate`,
      method: 'POST',
      type: 'application/json',
      title: 'Re-synthesize audio'
    };

    // Related conversation
    if (resource.conversation_id) {
      links.conversation = {
        href: `${baseUrl}/api/v3/conversations/${resource.conversation_id}`,
        title: 'Related conversation'
      };
    }
  }

  private addRulesLinks(links: HALLinks, resource: any, baseUrl: string): void {
    // Rule validation
    links.validate = {
      href: `${baseUrl}/api/v3/rules/${resource.id}/validate`,
      method: 'POST',
      type: 'application/json',
      title: 'Validate against this rule'
    };

    // Related rules
    links.related = {
      href: `${baseUrl}/api/v3/rules?category=${resource.category}`,
      title: 'Related rules'
    };

    // Rule examples
    links.examples = {
      href: `${baseUrl}/api/v3/rules/${resource.id}/examples`,
      title: 'Rule usage examples'
    };
  }

  /**
   * Build a URL for the collection with query parameters
   */
  private buildCollectionUrl(baseUrl: string, query: any): string {
    const url = new URL(`${baseUrl}${this.resourcePath}`);
    
    Object.keys(query).forEach(key => {
      if (query[key] !== undefined && query[key] !== null) {
        url.searchParams.append(key, query[key].toString());
      }
    });

    return url.toString();
  }

  /**
   * Get base URL from request
   */
  private getBaseUrl(req: Request): string {
    if (this.baseUrl) return this.baseUrl;
    
    const protocol = req.get('X-Forwarded-Proto') || req.protocol;
    const host = req.get('X-Forwarded-Host') || req.get('Host');
    
    return `${protocol}://${host}`;
  }

  /**
   * Extract resource type from path
   */
  private getResourceTypeFromPath(): string {
    const parts = this.resourcePath.split('/').filter(Boolean);
    return parts[parts.length - 1]; // Last part is the resource type
  }

  /**
   * Set base URL (useful for testing or when behind proxy)
   */
  public setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }
}