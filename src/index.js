/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

async function createAirtableRecord(env, body) {
	try {
		const result = fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(env.AIRTABLE_TABLE_NAME)}`, {
			method: 'POST',
			body: JSON.stringify(body),
			headers: {
				Authorization: `Bearer ${env.AIRTABLE_ACCESS_TOKEN}`,
				'Content-Type': 'application/json',
			},
		});
		return result;
	} catch (error) {
		console.error(error);
	}
}

async function submitHandler(request, env) {
	if (request.method !== 'POST') {
		return new Response('Method Not Allowed', {
			status: 405,
		});
	}
	const body = await request.formData();

	const { name, email, phone, message, country, category } = Object.fromEntries(body);

	var currentDate = new Date().toISOString().split('T')[0]; //use your date here

	// The keys in "fields" are case-sensitive, and
	// should exactly match the field names you set up
	// in your Airtable table, such as "First Name".
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
	await createAirtableRecord(env, reqBody);
}

export default {
	async fetch(request, env) {
		const base = 'https://eurochennai.design/';
		const statusCode = 301;
		const destinationURL = `${base}`;

		const url = new URL(request.url);
		if (url.pathname === '/submit') {
			await submitHandler(request, env);
			return Response.redirect(destinationURL, statusCode);
		}
		return new Response('Not found', { status: 404 });
	},
};
