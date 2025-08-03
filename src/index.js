/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const ALLOWED_ORIGINS = [
  'https://eurochennai.design',
  'https://euro-2.euro-architrade-01-cgh.pages.dev',
  // add other frontends if needed
];

function makeCORSHeaders(origin) {
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

async function createAirtableRecord(env, body) {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(
        env.AIRTABLE_TABLE_NAME
      )}`,
      {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          Authorization: `Bearer ${env.AIRTABLE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.ok) {
      const text = await response.text();
      console.error('Airtable error:', response.status, text);
    }
    return response;
  } catch (error) {
    console.error('Error creating Airtable record:', error);
    throw error;
  }
}

async function submitHandler(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...makeCORSHeaders(origin),
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        ...makeCORSHeaders(origin),
        Allow: 'POST, OPTIONS',
      },
    });
  }

  const body = await request.formData();

  // Honeypot
  if (body.get('bot-field')) {
    return new Response(
      JSON.stringify({ success: false, reason: 'Bot suspected' }),
      {
        status: 200,
        headers: {
          ...makeCORSHeaders(origin),
          'Content-Type': 'application/json',
        },
      }
    );
  }

  const {
    name = '',
    email = '',
    phone = '',
    message = '',
    country = '',
    category = '',
  } = Object.fromEntries(body);

  const currentDate = new Date().toISOString().split('T')[0];

  const reqBody = {
    fields: {
      Name: name,
      Email: email,
      'Phone Number': phone,
      Message: message,
      'Date of Entry': currentDate,
      Country: country,
      'Category Number': category,
    },
  };

  try {
    await createAirtableRecord(env, reqBody);
  } catch (err) {
    // If Airtable failed, still respond (but indicate failure)
    const acceptsJson = request.headers
      .get('Accept')
      ?.includes('application/json');
    if (acceptsJson) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save record' }),
        {
          status: 500,
          headers: {
            ...makeCORSHeaders(origin),
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      // fallback redirect even on error
      return Response.redirect('https://eurochennai.design/thank-you/', 301);
    }
  }

  // Success path
  const acceptsJson = request.headers.get('Accept')?.includes('application/json');
  if (acceptsJson) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...makeCORSHeaders(origin),
        'Content-Type': 'application/json',
      },
    });
  } else {
    // regular form POST fallback: redirect to thank-you
    return Response.redirect('https://eurochennai.design/thank-you/', 301);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/submit') {
      return await submitHandler(request, env);
    }
    return new Response('Not found', { status: 404 });
  },
};
