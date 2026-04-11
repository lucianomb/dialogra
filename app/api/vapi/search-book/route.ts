import { NextResponse } from 'next/server';
import { searchBookSegments } from '@/lib/actions/book.actions';

type ToolCall = {
  id?: string;
  name?: string;
  parameters?: Record<string, unknown> | string;
  function?: {
    name?: string;
    arguments?: Record<string, unknown> | string;
  };
};

const FALLBACK_RESULT = 'no information found about this topic';

const normalizeToolName = (name?: string) => name?.toLowerCase().replace(/[_\-]+/g, ' ').trim();

const parseParameters = (toolCall: ToolCall): Record<string, unknown> => {
  const rawParams = toolCall.parameters ?? toolCall.function?.arguments;

  if (!rawParams) return {};

  if (typeof rawParams === 'string') {
    try {
      return JSON.parse(rawParams) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  return rawParams;
};

const getStringParam = (params: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      toolCalls?: ToolCall[];
      message?: { toolCalls?: ToolCall[] };
    };

    const incomingCalls = body.toolCalls ?? body.message?.toolCalls ?? [];

    const targetCalls = incomingCalls.filter((call) => {
      const name = call.name ?? call.function?.name;
      return normalizeToolName(name) === 'search book';
    });

    const results = await Promise.all(
      targetCalls.map(async (call) => {
        const params = parseParameters(call);
        const bookId = getStringParam(params, ['bookId', 'book_id']);
        const query = getStringParam(params, ['query', 'q']);

        if (!bookId || !query) {
          return { toolCallId: call.id, result: FALLBACK_RESULT };
        }

        const searchResult = await searchBookSegments(bookId, query, 3);

        if (!searchResult.success || searchResult.data.length === 0) {
          return { toolCallId: call.id, result: FALLBACK_RESULT };
        }

        const result = searchResult.data
          .map((segment) => `Segment ${segment.segmentIndex}: ${segment.content}`)
          .join('\n\n');

        return {
          toolCallId: call.id,
          result: result || FALLBACK_RESULT,
        };
      }),
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('VAPI search-book route error:', error);
    return NextResponse.json({ results: [], error: 'Invalid request body' }, { status: 400 });
  }
}

