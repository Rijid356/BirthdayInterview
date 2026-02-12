let cachedToken = null;
let tokenExpiresAt = 0;

export async function getSpotifyToken(clientId, clientSecret) {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed (${response.status})`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Expire 60s early to avoid edge cases
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

export async function searchTrack(query, token) {
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: '1',
  });

  const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Spotify search failed (${response.status})`);
  }

  const data = await response.json();
  const track = data.tracks?.items?.[0];
  if (!track) return null;

  return {
    trackId: track.id,
    trackName: track.name,
    artistName: track.artists.map((a) => a.name).join(', '),
    albumArt: track.album.images?.[0]?.url || null,
    previewUrl: track.preview_url || null,
    spotifyUri: track.uri,
  };
}

export async function searchSongForInterview(answerText, apiKeys) {
  if (!answerText || !apiKeys.spotifyClientId || !apiKeys.spotifyClientSecret) {
    return null;
  }

  try {
    const token = await getSpotifyToken(apiKeys.spotifyClientId, apiKeys.spotifyClientSecret);
    return await searchTrack(answerText, token);
  } catch (e) {
    console.warn('Spotify search failed:', e.message);
    return null;
  }
}
