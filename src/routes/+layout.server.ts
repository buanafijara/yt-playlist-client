import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	// only the profile goes to the browser — tokens stay on the server
	return { user: locals.session?.user ?? null };
};
