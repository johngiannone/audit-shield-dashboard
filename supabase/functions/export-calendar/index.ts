import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createAdminClient, authenticateUser } from '../_shared/supabase.ts';

interface Case {
  id: string;
  case_number: string;
  case_type: string;
  deadline: string | null;
  response_due_date: string | null;
  status: string;
  created_at: string;
}

interface ICalEvent {
  uid: string;
  dtstart: string;
  dtend: string;
  summary: string;
  description: string;
  created: string;
  lastModified: string;
}

const generateICalDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .split('.')[0] + 'Z';
};

const generateUID = (caseId: string, type: string): string => {
  return `${type}-${caseId}@audit-shield-dashboard`;
};

const generateICalContent = (cases: Case[]): string => {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  let iCalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Audit Shield Dashboard//IRS Deadlines//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:IRS Deadlines
X-WR-TIMEZONE:UTC
BEGIN:VTIMEZONE
TZID:UTC
BEGIN:STANDARD
TZOFFSETFROM:+0000
TZOFFSETTO:+0000
TZNAME:UTC
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE
`;

  const events: ICalEvent[] = [];

  cases.forEach((caseRecord) => {
    // Add deadline event
    if (caseRecord.deadline) {
      const deadlineDate = new Date(caseRecord.deadline);
      const nextDay = new Date(deadlineDate);
      nextDay.setDate(nextDay.getDate() + 1);

      events.push({
        uid: generateUID(caseRecord.id, 'deadline'),
        dtstart: generateICalDate(caseRecord.deadline),
        dtend: generateICalDate(nextDay.toISOString()),
        summary: `IRS Deadline - ${caseRecord.case_number} (${caseRecord.case_type})`,
        description: `Case: ${caseRecord.case_number}\nType: ${caseRecord.case_type}\nStatus: ${caseRecord.status}`,
        created: now,
        lastModified: now,
      });
    }

    // Add response due date event
    if (caseRecord.response_due_date) {
      const responseDueDate = new Date(caseRecord.response_due_date);
      const nextDay = new Date(responseDueDate);
      nextDay.setDate(nextDay.getDate() + 1);

      events.push({
        uid: generateUID(caseRecord.id, 'response-due'),
        dtstart: generateICalDate(caseRecord.response_due_date),
        dtend: generateICalDate(nextDay.toISOString()),
        summary: `Response Due - ${caseRecord.case_number} (${caseRecord.case_type})`,
        description: `Case: ${caseRecord.case_number}\nType: ${caseRecord.case_type}\nResponse deadline for case ${caseRecord.case_number}`,
        created: now,
        lastModified: now,
      });
    }
  });

  // Add all events to calendar
  events.forEach((event) => {
    iCalContent += `BEGIN:VEVENT
UID:${event.uid}
DTSTAMP:${event.created}
DTSTART:${event.dtstart}
DTEND:${event.dtend}
SUMMARY:${event.summary}
DESCRIPTION:${event.description}
CREATED:${event.created}
LAST-MODIFIED:${event.lastModified}
SEQUENCE:0
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
`;
  });

  iCalContent += `END:VCALENDAR`;

  return iCalContent;
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
          message: 'Only GET requests are supported',
        }),
        {
          status: 405,
          headers: {
            ...getCorsHeaders(),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authorization header is required',
        }),
        {
          status: 401,
          headers: {
            ...getCorsHeaders(),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const adminClient = createAdminClient();
    const user = await authenticateUser(adminClient, authHeader);

    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        }),
        {
          status: 401,
          headers: {
            ...getCorsHeaders(),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Query user's cases with deadline information
    const { data: cases, error: queriedError } = await adminClient
      .from('cases')
      .select(
        'id, case_number, case_type, deadline, response_due_date, status, created_at'
      )
      .or(`agent_profile_id.eq.${user.id},client_profile_id.eq.${user.id}`)
      .not('deadline', 'is', null);

    if (queriedError) {
      console.error('Error querying cases:', queriedError);
      return new Response(
        JSON.stringify({
          error: 'Database error',
          message: 'Failed to fetch cases',
        }),
        {
          status: 500,
          headers: {
            ...getCorsHeaders(),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Generate iCal content
    const iCalContent = generateICalContent((cases as Case[]) || []);

    // Return iCal file
    return new Response(iCalContent, {
      status: 200,
      headers: {
        ...getCorsHeaders(),
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="irs-deadlines.ics"',
      },
    });
  } catch (error) {
    console.error('Export calendar error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          ...getCorsHeaders(),
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
