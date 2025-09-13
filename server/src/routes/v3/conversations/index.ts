/**
 * Conversations Router
 * 
 * RESTful routes for conversation management with nested message resources
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { ConversationsResource } from './conversations-resource';
import { ConversationMessagesResource } from './messages-resource';
import { MethodNotAllowedError } from '../../../lib/rest/rest-errors';

export function createConversationsRouter(db: Pool): Router {
  const router = Router();
  const conversationsResource = new ConversationsResource(db);
  const messagesResource = new ConversationMessagesResource(db);

  // Conversations collection routes
  router.route('/')
    .get((req, res, next) => conversationsResource.handleCollection(req, res, next))
    .post((req, res, next) => conversationsResource.handleCreate(req, res, next))
    .options((req, res) => conversationsResource.handleOptions(req, res))
    .all((req, res, next) => {
      next(new MethodNotAllowedError(['GET', 'POST', 'OPTIONS']));
    });

  // Individual conversation routes
  router.route('/:id')
    .get((req, res, next) => conversationsResource.handleResource(req, res, next))
    .put((req, res, next) => conversationsResource.handleUpdate(req, res, next))
    .patch((req, res, next) => conversationsResource.handlePartialUpdate(req, res, next))
    .delete((req, res, next) => conversationsResource.handleDelete(req, res, next))
    .options((req, res) => conversationsResource.handleOptions(req, res))
    .all((req, res, next) => {
      next(new MethodNotAllowedError(['GET', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']));
    });

  // Conversation messages sub-resource routes
  router.route('/:conversationId/messages')
    .get((req, res, next) => messagesResource.handleCollection(req, res, next))
    .post((req, res, next) => messagesResource.handleCreate(req, res, next))
    .options((req, res) => messagesResource.handleOptions(req, res))
    .all((req, res, next) => {
      next(new MethodNotAllowedError(['GET', 'POST', 'OPTIONS']));
    });

  // Individual message routes
  router.route('/:conversationId/messages/:messageId')
    .get((req, res, next) => messagesResource.handleResource(req, res, next))
    .put((req, res, next) => messagesResource.handleUpdate(req, res, next))
    .patch((req, res, next) => messagesResource.handlePartialUpdate(req, res, next))
    .delete((req, res, next) => messagesResource.handleDelete(req, res, next))
    .options((req, res) => messagesResource.handleOptions(req, res))
    .all((req, res, next) => {
      next(new MethodNotAllowedError(['GET', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']));
    });

  // Conversation participants sub-resource
  router.route('/:conversationId/participants')
    .get(async (req, res, next) => {
      try {
        const conversation = await conversationsResource['getResource'](req.params.conversationId);
        if (!conversation) {
          return res.status(404).json({
            type: 'https://httpstatuses.com/404',
            title: 'Not Found',
            detail: 'Conversation not found',
            status: 404
          });
        }

        res.json({
          data: conversation.participants,
          _links: {
            self: {
              href: `${req.protocol}://${req.get('host')}/api/v3/conversations/${req.params.conversationId}/participants`
            },
            conversation: {
              href: `${req.protocol}://${req.get('host')}/api/v3/conversations/${req.params.conversationId}`
            }
          }
        });
      } catch (error) {
        next(error);
      }
    })
    .post(async (req, res, next) => {
      try {
        const { participant_id } = req.body;
        
        if (!participant_id) {
          return res.status(400).json({
            type: 'https://httpstatuses.com/400',
            title: 'Bad Request',
            detail: 'participant_id is required',
            status: 400
          });
        }

        const conversation = await conversationsResource['getResource'](req.params.conversationId);
        if (!conversation) {
          return res.status(404).json({
            type: 'https://httpstatuses.com/404',
            title: 'Not Found',
            detail: 'Conversation not found',
            status: 404
          });
        }

        if (conversation.participants.includes(participant_id)) {
          return res.status(409).json({
            type: 'https://httpstatuses.com/409',
            title: 'Conflict',
            detail: 'Participant already in conversation',
            status: 409
          });
        }

        const updatedParticipants = [...conversation.participants, participant_id];
        const updated = await conversationsResource['patchResource'](req.params.conversationId, {
          participants: updatedParticipants
        });

        res.status(201).json({
          data: updated.participants,
          _links: {
            self: {
              href: `${req.protocol}://${req.get('host')}/api/v3/conversations/${req.params.conversationId}/participants`
            },
            conversation: {
              href: `${req.protocol}://${req.get('host')}/api/v3/conversations/${req.params.conversationId}`
            }
          }
        });
      } catch (error) {
        next(error);
      }
    })
    .options((req, res) => {
      res.set({
        'Allow': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      });
      res.status(200).end();
    })
    .all((req, res, next) => {
      next(new MethodNotAllowedError(['GET', 'POST', 'OPTIONS']));
    });

  // Remove participant from conversation
  router.route('/:conversationId/participants/:participantId')
    .delete(async (req, res, next) => {
      try {
        const conversation = await conversationsResource['getResource'](req.params.conversationId);
        if (!conversation) {
          return res.status(404).json({
            type: 'https://httpstatuses.com/404',
            title: 'Not Found',
            detail: 'Conversation not found',
            status: 404
          });
        }

        const participantIndex = conversation.participants.indexOf(req.params.participantId);
        if (participantIndex === -1) {
          return res.status(404).json({
            type: 'https://httpstatuses.com/404',
            title: 'Not Found',
            detail: 'Participant not found in conversation',
            status: 404
          });
        }

        const updatedParticipants = conversation.participants.filter(p => p !== req.params.participantId);
        await conversationsResource['patchResource'](req.params.conversationId, {
          participants: updatedParticipants
        });

        res.status(204).end();
      } catch (error) {
        next(error);
      }
    })
    .options((req, res) => {
      res.set({
        'Allow': 'DELETE, OPTIONS',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
      });
      res.status(200).end();
    })
    .all((req, res, next) => {
      next(new MethodNotAllowedError(['DELETE', 'OPTIONS']));
    });

  return router;
}