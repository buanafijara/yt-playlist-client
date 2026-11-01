export interface Video {
	id: string;
	title: string;
	channelId: string;
	channelTitle: string;
	thumbnail: string;
	publishedAt: string;
	/** ISO 8601 duration, e.g. PT4M13S */
	duration?: string;
}

export interface PlaylistRef {
	id: string;
	title: string;
}

export interface PlaylistSummary extends PlaylistRef {
	/** as reported by YouTube, so it includes deleted and private videos */
	count: number;
}

export interface PlaylistItem extends Video {
	/** when it was added to the playlist */
	addedAt: string;
}

/** One batch of a playlist, as returned by /api/playlists/[id]/items */
export interface PlaylistPage {
	items: PlaylistItem[];
	nextPageToken?: string;
}

export interface PlaylistVideo extends PlaylistItem {
	/** every loaded playlist this video appears in */
	playlists: PlaylistRef[];
}
