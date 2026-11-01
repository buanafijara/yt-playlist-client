import { friendlyErrors, getSubscriptionFeed, requireToken } from '#lib/server/youtube.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const token = requireToken(event);
	// not awaited: the page renders a skeleton right away and the data streams in when ready
	return { result: friendlyErrors(getSubscriptionFeed(token)) };
};
