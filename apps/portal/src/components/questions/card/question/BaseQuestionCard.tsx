import clsx from 'clsx';
import { useState } from 'react';
import {
  ChatBubbleBottomCenterTextIcon,
  CheckIcon,
  EyeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import type { QuestionsQuestionType } from '@prisma/client';
import { Button } from '@tih/ui';

import { useQuestionVote } from '~/utils/questions/useVote';

import AddToListDropdown from '../../AddToListDropdown';
import type { CreateQuestionEncounterData } from '../../forms/CreateQuestionEncounterForm';
import CreateQuestionEncounterForm from '../../forms/CreateQuestionEncounterForm';
import QuestionAggregateBadge from '../../QuestionAggregateBadge';
import QuestionTypeBadge from '../../QuestionTypeBadge';
import VotingButtons from '../../VotingButtons';

type UpvoteProps =
  | {
      showVoteButtons: true;
      upvoteCount: number;
    }
  | {
      showVoteButtons?: false;
      upvoteCount?: never;
    };

type DeleteProps =
  | {
      onDelete: () => void;
      showDeleteButton: true;
    }
  | {
      onDelete?: never;
      showDeleteButton?: false;
    };

type AnswerStatisticsProps =
  | {
      answerCount: number;
      showAnswerStatistics: true;
    }
  | {
      answerCount?: never;
      showAnswerStatistics?: false;
    };

type AggregateStatisticsProps =
  | {
      companies: Record<string, number>;
      locations: Record<string, number>;
      roles: Record<string, number>;
      showAggregateStatistics: true;
    }
  | {
      companies?: never;
      locations?: never;
      roles?: never;
      showAggregateStatistics?: false;
    };

type ActionButtonProps =
  | {
      actionButtonLabel: string;
      onActionButtonClick: () => void;
      showActionButton: true;
    }
  | {
      actionButtonLabel?: never;
      onActionButtonClick?: never;
      showActionButton?: false;
    };

type ReceivedStatisticsProps =
  | {
      receivedCount: number;
      showReceivedStatistics: true;
    }
  | {
      receivedCount?: never;
      showReceivedStatistics?: false;
    };

type CreateEncounterProps =
  | {
      onReceivedSubmit: (data: CreateQuestionEncounterData) => void;
      showCreateEncounterButton: true;
    }
  | {
      onReceivedSubmit?: never;
      showCreateEncounterButton?: false;
    };

type AddToListProps =
  | {
      showAddToList: true;
    }
  | {
      showAddToList?: false;
    };

export type BaseQuestionCardProps = ActionButtonProps &
  AddToListProps &
  AggregateStatisticsProps &
  AnswerStatisticsProps &
  CreateEncounterProps &
  DeleteProps &
  ReceivedStatisticsProps &
  UpvoteProps & {
    content: string;
    questionId: string;
    showHover?: boolean;
    timestamp: string | null;
    truncateContent?: boolean;
    type: QuestionsQuestionType;
  };

export default function BaseQuestionCard({
  questionId,
  companies,
  answerCount,
  content,
  receivedCount,
  type,
  showVoteButtons,
  showAggregateStatistics,
  showAnswerStatistics,
  showReceivedStatistics,
  showCreateEncounterButton,
  showActionButton,
  actionButtonLabel,
  onActionButtonClick,
  upvoteCount,
  timestamp,
  roles,
  locations,
  showHover,
  onReceivedSubmit,
  showDeleteButton,
  showAddToList,
  onDelete,
  truncateContent = true,
}: BaseQuestionCardProps) {
  const [showReceivedForm, setShowReceivedForm] = useState(false);
  const { handleDownvote, handleUpvote, vote } = useQuestionVote(questionId);
  const hoverClass = showHover ? 'hover:bg-slate-50' : '';
  const cardContent = (
    <>
      {showVoteButtons && (
        <VotingButtons
          upvoteCount={upvoteCount}
          vote={vote}
          onDownvote={handleDownvote}
          onUpvote={handleUpvote}
        />
      )}
      <div className="flex flex-1 flex-col items-start gap-2">
        <div className="flex items-baseline justify-between self-stretch">
          <div className="flex items-center gap-2 text-slate-500">
            {showAggregateStatistics && (
              <>
                <QuestionTypeBadge type={type} />
                <QuestionAggregateBadge
                  statistics={companies}
                  variant="primary"
                />
                <QuestionAggregateBadge
                  statistics={locations}
                  variant="success"
                />
                <QuestionAggregateBadge statistics={roles} variant="danger" />
              </>
            )}
            {timestamp !== null && <p className="text-xs">{timestamp}</p>}
            {showAddToList && (
              <div className="pl-4">
                <AddToListDropdown questionId={questionId} />
              </div>
            )}
          </div>
          {showActionButton && (
            <Button
              label={actionButtonLabel}
              size="sm"
              variant="secondary"
              onClick={onActionButtonClick}
            />
          )}
        </div>
        <p className={clsx(truncateContent && 'line-clamp-2 text-ellipsis')}>
          {content}
        </p>
        {!showReceivedForm &&
          (showAnswerStatistics ||
            showReceivedStatistics ||
            showCreateEncounterButton) && (
            <div className="flex gap-2">
              {showAnswerStatistics && (
                <Button
                  addonPosition="start"
                  icon={ChatBubbleBottomCenterTextIcon}
                  label={`${answerCount} answers`}
                  size="sm"
                  variant="tertiary"
                />
              )}
              {showReceivedStatistics && (
                <Button
                  addonPosition="start"
                  icon={EyeIcon}
                  label={`${receivedCount} received this`}
                  size="sm"
                  variant="tertiary"
                />
              )}
              {showCreateEncounterButton && (
                <Button
                  addonPosition="start"
                  icon={CheckIcon}
                  label="I received this too"
                  size="sm"
                  variant="tertiary"
                  onClick={(event) => {
                    event.preventDefault();
                    setShowReceivedForm(true);
                  }}
                />
              )}
            </div>
          )}
        {showReceivedForm && (
          <CreateQuestionEncounterForm
            onCancel={() => {
              setShowReceivedForm(false);
            }}
            onSubmit={(data) => {
              onReceivedSubmit?.(data);
              setShowReceivedForm(false);
            }}
          />
        )}
      </div>
    </>
  );

  return (
    <article
      className={`group flex gap-4 rounded-md border border-slate-300 bg-white p-4 ${hoverClass}`}>
      {cardContent}
      {showDeleteButton && (
        <div className="fill-danger-700 invisible	self-center group-hover:visible">
          <Button
            icon={TrashIcon}
            isLabelHidden={true}
            label="Delete"
            size="md"
            variant="tertiary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
          />
        </div>
      )}
    </article>
  );
}
