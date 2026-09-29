import { CallLogEntry, CallStatus } from '../types/crm';

/**
 * Generates or updates a concise 1-3 sentence summary of a contact's call history.
 * Synthesizes prior comments, the latest interaction, and current status.
 */
export function generateLeadSummary(params: {
  existingSummary?: string;
  allComments?: string[];
  callLogs?: CallLogEntry[];
  currentStatus: CallStatus | string;
  latestComment?: string;
  nextFollowUpDate?: string;
}): string {
  const {
    existingSummary,
    allComments = [],
    callLogs = [],
    currentStatus,
    latestComment,
    nextFollowUpDate,
  } = params;

  // Gather unique non-empty comments in chronological order
  const commentList: string[] = [];

  if (allComments.length > 0) {
    for (const c of allComments) {
      const trimmed = c?.trim();
      if (trimmed && !commentList.includes(trimmed)) {
        commentList.push(trimmed);
      }
    }
  }

  // Add comments from call logs (sorted chronologically)
  const sortedLogs = [...callLogs].sort((a, b) => a.timestamp - b.timestamp);
  for (const log of sortedLogs) {
    const trimmed = log.comment?.trim();
    if (trimmed && !commentList.includes(trimmed)) {
      commentList.push(trimmed);
    }
  }

  if (latestComment?.trim() && !commentList.includes(latestComment.trim())) {
    commentList.push(latestComment.trim());
  }

  if (commentList.length === 0) {
    if (currentStatus === 'Not Called') {
      return 'New prospect. No calls made yet.';
    }
    return `Current status: ${currentStatus}.`;
  }

  // If there's only one short comment
  if (commentList.length === 1) {
    const single = commentList[0];
    if (single.length <= 150) {
      if (nextFollowUpDate) {
        return `${single.replace(/\.+$/, '')}. Follow-up scheduled for ${nextFollowUpDate}.`;
      }
      return single.endsWith('.') ? single : `${single}.`;
    }
  }

  // Multi-comment synthesis:
  // Identify key themes and recent development
  const fullText = commentList.join(' ');
  const lowerFull = fullText.toLowerCase();
  const lastComment = commentList[commentList.length - 1];
  const lastLower = lastComment.toLowerCase();

  const parts: string[] = [];

  // 1. Prospect Interest / Core Subject
  if (
    lowerFull.includes('interested') ||
    currentStatus === 'Interested' ||
    currentStatus === 'Appointment Booked'
  ) {
    if (lowerFull.includes('pricing') || lowerFull.includes('quote') || lowerFull.includes('cost')) {
      parts.push('Prospect is interested and requested pricing');
    } else if (lowerFull.includes('meeting') || lowerFull.includes('demo') || currentStatus === 'Appointment Booked') {
      parts.push('Prospect engaged and agreed to a meeting/demo');
    } else if (lowerFull.includes('software') || lowerFull.includes('development') || lowerFull.includes('engineering') || lowerFull.includes('services')) {
      parts.push('Prospect expressed interest in software and development services');
    } else {
      parts.push('Prospect is interested');
    }
  } else if (currentStatus === 'Not Interested' || lowerFull.includes('not interested')) {
    parts.push('Prospect indicated they are not interested currently');
  } else if (currentStatus === 'Wrong Number' || lowerFull.includes('wrong number')) {
    parts.push('Invalid or wrong contact number');
  } else if (
    currentStatus === 'No Answer' &&
    (lowerFull.includes('voicemail') || lowerFull.includes('no answer') || lowerFull.includes('busy'))
  ) {
    parts.push('Multiple call attempts with no answer or voicemail reached');
  }

  // 2. Latest action or conversation milestone
  if (lastLower.includes('sent pricing') || lastLower.includes('pricing sent')) {
    parts.push('pricing was sent');
  } else if (lastLower.includes('profile sent') || lastLower.includes('sent profile')) {
    parts.push('company profile was shared');
  } else if (lastLower.includes('discuss with') || lastLower.includes('internal discussion')) {
    parts.push('awaiting internal team discussion');
  } else if (lastLower.includes('call back') || lastLower.includes('call next week')) {
    parts.push('requested to call back at a later time');
  } else if (lastLower.includes('meeting confirmed') || lastLower.includes('appointment booked')) {
    parts.push('meeting has been confirmed');
  } else if (lastComment.length < 90 && !parts.some(p => p.includes(lastComment.slice(0, 15)))) {
    // Append the specific latest note cleanly
    parts.push(`latest note: "${lastComment.replace(/\.+$/, '')}"`);
  }

  // 3. Next step / follow-up
  if (nextFollowUpDate && currentStatus !== 'Converted' && currentStatus !== 'Not Interested' && currentStatus !== 'Do Not Call') {
    parts.push(`next follow-up is scheduled for ${nextFollowUpDate}`);
  }

  if (parts.length > 0) {
    // Format into natural sentence structure
    const sentence = parts
      .map((p, idx) => (idx === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p))
      .join('. ') + '.';
    return sentence;
  }

  // Fallback: Last comment + follow-up
  if (nextFollowUpDate) {
    return `${lastComment.replace(/\.+$/, '')}. Follow-up due ${nextFollowUpDate}.`;
  }
  return lastComment.endsWith('.') ? lastComment : `${lastComment}.`;
}
