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
	/** ID of this entry in the playlist, used to remove it */
	itemId: string;
}

/** One batch of a playlist, as returned by /api/playlists/[id]/items */
export interface PlaylistPage {
	items: PlaylistItem[];
	nextPageToken?: string;
}

/** A playlist a video is in, and the entry that puts it there */
export interface Membership extends PlaylistRef {
	itemId: string;
}

export interface PlaylistVideo extends Video {
	/** most recent time it was added to one of the loaded playlists */
	addedAt: string;
	/** every loaded playlist this video appears in */
	playlists: Membership[];
}
