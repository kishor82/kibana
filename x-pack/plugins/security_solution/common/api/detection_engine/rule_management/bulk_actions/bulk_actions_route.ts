/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { NonEmptyArray, TimeDuration } from '@kbn/securitysolution-io-ts-types';
import {
  RuleActionAlertsFilter,
  RuleActionFrequency,
  RuleActionGroup,
  RuleActionId,
  RuleActionParams,
} from '@kbn/securitysolution-io-ts-alerting-types';

import type { BulkActionSkipResult } from '@kbn/alerting-plugin/common';
import type { RuleResponse } from '../../model';
import type { BulkActionsDryRunErrCode } from '../../../../constants';

import {
  IndexPatternArray,
  RuleQuery,
  RuleTagArray,
  TimelineTemplateId,
  TimelineTemplateTitle,
} from '../../model';

export enum BulkActionType {
  'enable' = 'enable',
  'disable' = 'disable',
  'export' = 'export',
  'delete' = 'delete',
  'duplicate' = 'duplicate',
  'edit' = 'edit',
}

export enum BulkActionEditType {
  'add_tags' = 'add_tags',
  'delete_tags' = 'delete_tags',
  'set_tags' = 'set_tags',
  'add_index_patterns' = 'add_index_patterns',
  'delete_index_patterns' = 'delete_index_patterns',
  'set_index_patterns' = 'set_index_patterns',
  'set_timeline' = 'set_timeline',
  'add_rule_actions' = 'add_rule_actions',
  'set_rule_actions' = 'set_rule_actions',
  'set_schedule' = 'set_schedule',
}

export type ThrottleForBulkActions = t.TypeOf<typeof ThrottleForBulkActions>;
export const ThrottleForBulkActions = t.union([
  t.literal('rule'),
  t.literal('1h'),
  t.literal('1d'),
  t.literal('7d'),
]);

type BulkActionEditPayloadTags = t.TypeOf<typeof BulkActionEditPayloadTags>;
const BulkActionEditPayloadTags = t.type({
  type: t.union([
    t.literal(BulkActionEditType.add_tags),
    t.literal(BulkActionEditType.delete_tags),
    t.literal(BulkActionEditType.set_tags),
  ]),
  value: RuleTagArray,
});

export type BulkActionEditPayloadIndexPatterns = t.TypeOf<
  typeof BulkActionEditPayloadIndexPatterns
>;
const BulkActionEditPayloadIndexPatterns = t.intersection([
  t.type({
    type: t.union([
      t.literal(BulkActionEditType.add_index_patterns),
      t.literal(BulkActionEditType.delete_index_patterns),
      t.literal(BulkActionEditType.set_index_patterns),
    ]),
    value: IndexPatternArray,
  }),
  t.exact(t.partial({ overwrite_data_views: t.boolean })),
]);

type BulkActionEditPayloadTimeline = t.TypeOf<typeof BulkActionEditPayloadTimeline>;
const BulkActionEditPayloadTimeline = t.type({
  type: t.literal(BulkActionEditType.set_timeline),
  value: t.type({
    timeline_id: TimelineTemplateId,
    timeline_title: TimelineTemplateTitle,
  }),
});

/**
 * per rulesClient.bulkEdit rules actions operation contract (x-pack/plugins/alerting/server/rules_client/rules_client.ts)
 * normalized rule action object is expected (NormalizedAlertAction) as value for the edit operation
 */
export type NormalizedRuleAction = t.TypeOf<typeof NormalizedRuleAction>;
export const NormalizedRuleAction = t.exact(
  t.intersection([
    t.type({
      group: RuleActionGroup,
      id: RuleActionId,
      params: RuleActionParams,
    }),
    t.partial({ frequency: RuleActionFrequency }),
    t.partial({ alerts_filter: RuleActionAlertsFilter }),
  ])
);

export type BulkActionEditPayloadRuleActions = t.TypeOf<typeof BulkActionEditPayloadRuleActions>;
export const BulkActionEditPayloadRuleActions = t.type({
  type: t.union([
    t.literal(BulkActionEditType.add_rule_actions),
    t.literal(BulkActionEditType.set_rule_actions),
  ]),
  value: t.intersection([
    t.partial({ throttle: ThrottleForBulkActions }),
    t.type({
      actions: t.array(NormalizedRuleAction),
    }),
  ]),
});

type BulkActionEditPayloadSchedule = t.TypeOf<typeof BulkActionEditPayloadSchedule>;
const BulkActionEditPayloadSchedule = t.type({
  type: t.literal(BulkActionEditType.set_schedule),
  value: t.type({
    interval: TimeDuration({ allowedUnits: ['s', 'm', 'h'] }),
    lookback: TimeDuration({ allowedUnits: ['s', 'm', 'h'] }),
  }),
});

export type BulkActionEditPayload = t.TypeOf<typeof BulkActionEditPayload>;
export const BulkActionEditPayload = t.union([
  BulkActionEditPayloadTags,
  BulkActionEditPayloadIndexPatterns,
  BulkActionEditPayloadTimeline,
  BulkActionEditPayloadRuleActions,
  BulkActionEditPayloadSchedule,
]);

const bulkActionDuplicatePayload = t.exact(
  t.type({
    include_exceptions: t.boolean,
    include_expired_exceptions: t.boolean,
  })
);

export type BulkActionDuplicatePayload = t.TypeOf<typeof bulkActionDuplicatePayload>;

/**
 * actions that modify rules attributes
 */
export type BulkActionEditForRuleAttributes =
  | BulkActionEditPayloadTags
  | BulkActionEditPayloadRuleActions
  | BulkActionEditPayloadSchedule;

/**
 * actions that modify rules params
 */
export type BulkActionEditForRuleParams =
  | BulkActionEditPayloadIndexPatterns
  | BulkActionEditPayloadTimeline
  | BulkActionEditPayloadSchedule;

/**
 * Request body parameters of the API route.
 */
export type PerformBulkActionRequestBody = t.TypeOf<typeof PerformBulkActionRequestBody>;
export const PerformBulkActionRequestBody = t.intersection([
  t.exact(
    t.type({
      query: t.union([RuleQuery, t.undefined]),
    })
  ),
  t.exact(t.partial({ ids: NonEmptyArray(t.string) })),
  t.union([
    t.exact(
      t.type({
        action: t.union([
          t.literal(BulkActionType.delete),
          t.literal(BulkActionType.disable),
          t.literal(BulkActionType.enable),
          t.literal(BulkActionType.export),
        ]),
      })
    ),
    t.intersection([
      t.exact(
        t.type({
          action: t.literal(BulkActionType.duplicate),
        })
      ),
      t.exact(
        t.partial({
          [BulkActionType.duplicate]: bulkActionDuplicatePayload,
        })
      ),
    ]),
    t.exact(
      t.type({
        action: t.literal(BulkActionType.edit),
        [BulkActionType.edit]: NonEmptyArray(BulkActionEditPayload),
      })
    ),
  ]),
]);

/**
 * Query string parameters of the API route.
 */
export type PerformBulkActionRequestQuery = t.TypeOf<typeof PerformBulkActionRequestQuery>;
export const PerformBulkActionRequestQuery = t.exact(
  t.partial({
    dry_run: t.union([t.literal('true'), t.literal('false')]),
  })
);

export interface RuleDetailsInError {
  id: string;
  name?: string;
}
export interface NormalizedRuleError {
  message: string;
  status_code: number;
  err_code?: BulkActionsDryRunErrCode;
  rules: RuleDetailsInError[];
}
export interface BulkEditActionResults {
  updated: RuleResponse[];
  created: RuleResponse[];
  deleted: RuleResponse[];
  skipped: BulkActionSkipResult[];
}

export interface BulkEditActionSummary {
  failed: number;
  skipped: number;
  succeeded: number;
  total: number;
}
export interface BulkEditActionSuccessResponse {
  success: boolean;
  rules_count: number;
  attributes: {
    results: BulkEditActionResults;
    summary: BulkEditActionSummary;
  };
}
export interface BulkEditActionErrorResponse {
  status_code: number;
  message: string;
  attributes: {
    results: BulkEditActionResults;
    summary: BulkEditActionSummary;
    errors?: NormalizedRuleError[];
  };
}

export type BulkEditActionResponse = BulkEditActionSuccessResponse | BulkEditActionErrorResponse;

export type BulkExportActionResponse = string;

export type PerformBulkActionResponse = BulkEditActionResponse | BulkExportActionResponse;
