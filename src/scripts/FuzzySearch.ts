export type SearchableRecord = {
	title: string;
	subtitle?: string;
	author?: string;
	year?: number;
};

export type SearchResult = SearchableRecord & {
	score?: number;
	scoreLabel?: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

export const tokenize = (value: string) =>
	value
		.split(/[\s/,-]+/)
		.map((part) => part.trim())
		.filter(Boolean);

export const formatRecord = (
	record: SearchableRecord,
	overrides: Partial<Pick<SearchResult, "score" | "scoreLabel">> = {}
): SearchResult => ({
	title: record.title ?? "Untitled",
	subtitle: record.subtitle ?? "",
	author: record.author ?? "",
	year: typeof record.year === "number" ? record.year : undefined,
	...overrides
});

export const searchContains = (records: SearchableRecord[], query: string): SearchResult[] => {
	const normalized = normalize(query);

	if (!normalized) {
		return [];
	}

	const matches: SearchResult[] = [];

	for (const record of records) {
		const title = normalize(record.title ?? "");
		const subtitle = normalize(record.subtitle ?? "");
		const author = normalize(record.author ?? "");
		const yearText = typeof record.year === "number" ? String(record.year) : "";

		if (
			title.includes(normalized) ||
			subtitle.includes(normalized) ||
			author.includes(normalized) ||
			yearText.includes(normalized)
		) {
			matches.push(formatRecord(record, { scoreLabel: "Match" }));
		}
	}

	return matches;
};

const calculateSlidingHammingDistance = (needle: string, haystack: string) => {
	if (!needle.length || haystack.length < needle.length) {
		return Number.POSITIVE_INFINITY;
	}

	let bestDistance = Number.POSITIVE_INFINITY;

	for (let offset = 0; offset <= haystack.length - needle.length; offset += 1) {
		let distance = 0;
		for (let index = 0; index < needle.length; index += 1) {
			if (needle[index] !== haystack[offset + index]) {
				distance += 1;
			}
		}

		if (distance < bestDistance) {
			bestDistance = distance;
			if (bestDistance === 0) {
				break;
			}
		}
	}

	return bestDistance;
};

const hammingAgainstSegments = (value: string, normalizedQuery: string) => {
	if (!value) {
		return Number.POSITIVE_INFINITY;
	}

	const directDistance = calculateSlidingHammingDistance(normalizedQuery, value);
	if (directDistance === 0) {
		return 0;
	}

	const tokens = tokenize(value);
	const queryLength = normalizedQuery.length;
	let bestDistance = directDistance;

	for (let start = 0; start < tokens.length; start += 1) {
		let segment = "";

		for (let end = start; end < tokens.length; end += 1) {
			segment = segment ? `${segment} ${tokens[end]}` : tokens[end];

			if (segment.length < queryLength) {
				continue;
			}

			if (segment.length - queryLength > queryLength * 1.25) {
				break;
			}

			const distance = calculateSlidingHammingDistance(normalizedQuery, segment);
			if (distance < bestDistance) {
				bestDistance = distance;
				if (bestDistance === 0) {
					return 0;
				}
			}
		}
	}

	return bestDistance;
};

export const searchHamming = (records: SearchableRecord[], query: string): SearchResult[] => {
	const normalized = normalize(query);

	if (!normalized) {
		return [];
	}

	const matches: SearchResult[] = [];

	for (const record of records) {
		const title = normalize(record.title ?? "");
		const subtitle = normalize(record.subtitle ?? "");
		const author = normalize(record.author ?? "");
		const yearText = typeof record.year === "number" ? String(record.year) : "";

		const titleDistance = hammingAgainstSegments(title, normalized);
		const subtitleDistance = hammingAgainstSegments(subtitle, normalized);
		const authorDistance = hammingAgainstSegments(author, normalized);
		const yearDistance = hammingAgainstSegments(yearText, normalized);

		const minDistance = Math.min(titleDistance, subtitleDistance, authorDistance, yearDistance);
		const allowedDistance = Math.max(2, Math.ceil(normalized.length * 0.5));

		if (Number.isFinite(minDistance) && minDistance <= allowedDistance) {
			matches.push(formatRecord(record, { score: minDistance }));
		}
	}

	return matches;
};

const calculateLevenshteinDistance = (source: string, target: string, maxDistance = Number.POSITIVE_INFINITY) => {
	if (source === target) {
		return 0;
	}

	if (!source.length) {
		return target.length <= maxDistance ? target.length : Number.POSITIVE_INFINITY;
	}

	if (!target.length) {
		return source.length <= maxDistance ? source.length : Number.POSITIVE_INFINITY;
	}

	if (Math.abs(source.length - target.length) > maxDistance) {
		return Number.POSITIVE_INFINITY;
	}

	// Ensure source is the shorter string to keep the buffer small.
	if (source.length > target.length) {
		[source, target] = [target, source];
	}

	const previousRow = new Array(source.length + 1).fill(0);
	const currentRow = new Array(source.length + 1).fill(0);

	for (let i = 0; i <= source.length; i += 1) {
		previousRow[i] = i;
	}

	for (let row = 1; row <= target.length; row += 1) {
		currentRow[0] = row;
		let rowMin = currentRow[0];

		const targetChar = target[row - 1];

		for (let col = 1; col <= source.length; col += 1) {
			const cost = source[col - 1] === targetChar ? 0 : 1;

			currentRow[col] = Math.min(
				previousRow[col] + 1,
				currentRow[col - 1] + 1,
				previousRow[col - 1] + cost
			);

			rowMin = Math.min(rowMin, currentRow[col]);
		}

		if (rowMin > maxDistance) {
			return Number.POSITIVE_INFINITY;
		}

		for (let i = 0; i <= source.length; i += 1) {
			previousRow[i] = currentRow[i];
		}
	}

	return previousRow[source.length];
};

const levenshteinAgainstSegments = (value: string, normalizedQuery: string, maxDistance: number) => {
	if (!value) {
		return Number.POSITIVE_INFINITY;
	}

	const directDistance = calculateLevenshteinDistance(value, normalizedQuery, maxDistance);
	if (directDistance === 0) {
		return 0;
	}

	const queryLength = normalizedQuery.length;
	const tokens = tokenize(value);
	let bestDistance = directDistance;

	for (let start = 0; start < tokens.length; start += 1) {
		let segment = "";

		for (let end = start; end < tokens.length; end += 1) {
			segment = segment ? `${segment} ${tokens[end]}` : tokens[end];

			if (!segment.length) {
				continue;
			}

			if (Math.abs(segment.length - queryLength) > queryLength * 1.25) {
				if (segment.length > queryLength) {
					break;
				}
				continue;
			}

			const distance = calculateLevenshteinDistance(segment, normalizedQuery, maxDistance);
			if (distance < bestDistance) {
				bestDistance = distance;
				if (bestDistance === 0) {
					return 0;
				}
			}
		}
	}

	return bestDistance;
};

export const searchLevenshtein = (records: SearchableRecord[], query: string): SearchResult[] => {
	const normalized = normalize(query);

	if (!normalized) {
		return [];
	}

	const matches: SearchResult[] = [];

	const allowedDistance = Math.max(3, Math.ceil(normalized.length * 0.4));

	for (const record of records) {
		const title = normalize(record.title ?? "");
		const subtitle = normalize(record.subtitle ?? "");
		const author = normalize(record.author ?? "");
		const yearText = typeof record.year === "number" ? String(record.year) : "";

		const titleDistance = levenshteinAgainstSegments(title, normalized, allowedDistance);
		const subtitleDistance = levenshteinAgainstSegments(subtitle, normalized, allowedDistance);
		const authorDistance = levenshteinAgainstSegments(author, normalized, allowedDistance);
		const yearDistance = levenshteinAgainstSegments(yearText, normalized, allowedDistance);

		const minDistance = Math.min(titleDistance, subtitleDistance, authorDistance, yearDistance);

		if (Number.isFinite(minDistance) && minDistance <= allowedDistance) {
			matches.push(formatRecord(record, { score: minDistance }));
		}
	}

	return matches;
};

const calculateJaroWinklerSimilarity = (source: string, target: string, prefixScale = 0.1) => {
	if (!source.length && !target.length) {
		return 1;
	}

	if (!source.length || !target.length) {
		return 0;
	}

	const matchDistance = Math.max(0, Math.floor(Math.max(source.length, target.length) / 2) - 1);
	const sourceMatches = new Array(source.length).fill(false);
	const targetMatches = new Array(target.length).fill(false);

	let matches = 0;

	for (let i = 0; i < source.length; i += 1) {
		const start = Math.max(0, i - matchDistance);
		const end = Math.min(i + matchDistance + 1, target.length);

		for (let j = start; j < end; j += 1) {
			if (targetMatches[j]) {
				continue;
			}
			if (source[i] !== target[j]) {
				continue;
			}
			sourceMatches[i] = true;
			targetMatches[j] = true;
			matches += 1;
			break;
		}
	}

	if (!matches) {
		return 0;
	}

	let transpositions = 0;
	for (let i = 0, j = 0; i < source.length; i += 1) {
		if (!sourceMatches[i]) {
			continue;
		}

		while (!targetMatches[j]) {
			j += 1;
		}

		if (source[i] !== target[j]) {
			transpositions += 1;
		}
		j += 1;
	}

	transpositions /= 2;

	const jaro =
		(matches / source.length + matches / target.length + (matches - transpositions) / matches) / 3;

	let prefixLength = 0;
	const maxPrefix = Math.min(4, Math.min(source.length, target.length));
	for (; prefixLength < maxPrefix && source[prefixLength] === target[prefixLength]; prefixLength += 1);

	return jaro + prefixLength * prefixScale * (1 - jaro);
};

const jaroWinklerAgainstSegments = (value: string, normalizedQuery: string) => {
	if (!value) {
		return 0;
	}

	let bestScore = calculateJaroWinklerSimilarity(value, normalizedQuery);
	if (bestScore === 1) {
		return 1;
	}

	const tokens = tokenize(value);
	for (let start = 0; start < tokens.length; start += 1) {
		let segment = "";
		for (let end = start; end < tokens.length; end += 1) {
			segment = segment ? `${segment} ${tokens[end]}` : tokens[end];
			if (!segment.length) {
				continue;
			}
			const score = calculateJaroWinklerSimilarity(segment, normalizedQuery);
			if (score > bestScore) {
				bestScore = score;
				if (bestScore === 1) {
					return 1;
				}
			}
		}
	}

	return bestScore;
};

export const searchJaroWinkler = (records: SearchableRecord[], query: string): SearchResult[] => {
	const normalized = normalize(query);
	if (!normalized) {
		return [];
	}

	const matches: SearchResult[] = [];
	const minSimilarity = normalized.length >= 5 ? 0.82 : 0.9;

	for (const record of records) {
		const title = normalize(record.title ?? "");
		const subtitle = normalize(record.subtitle ?? "");
		const author = normalize(record.author ?? "");
		const yearText = typeof record.year === "number" ? String(record.year) : "";

		const bestSimilarity = Math.max(
			jaroWinklerAgainstSegments(title, normalized),
			jaroWinklerAgainstSegments(subtitle, normalized),
			jaroWinklerAgainstSegments(author, normalized),
			jaroWinklerAgainstSegments(yearText, normalized)
		);

		if (bestSimilarity >= minSimilarity) {
			const score = 1 - bestSimilarity;
			const similarityLabel = `${(bestSimilarity * 100).toFixed(1)}% similar`;
			matches.push(
				formatRecord(record, {
					score,
					scoreLabel: similarityLabel
				})
			);
		}
	}

	return matches;
};

const calculateDamerauLevenshteinDistance = (source: string, target: string, maxDistance = Number.POSITIVE_INFINITY) => {
	if (source === target) {
		return 0;
	}

	if (!source.length) {
		return target.length <= maxDistance ? target.length : Number.POSITIVE_INFINITY;
	}

	if (!target.length) {
		return source.length <= maxDistance ? source.length : Number.POSITIVE_INFINITY;
	}

	if (Math.abs(source.length - target.length) > maxDistance) {
		return Number.POSITIVE_INFINITY;
	}

	const rows = source.length + 1;
	const cols = target.length + 1;
	const matrix: number[][] = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

	for (let i = 0; i < rows; i += 1) {
		matrix[i][0] = i;
	}
	for (let j = 0; j < cols; j += 1) {
		matrix[0][j] = j;
	}

	for (let i = 1; i < rows; i += 1) {
		let rowMin = Number.POSITIVE_INFINITY;
		for (let j = 1; j < cols; j += 1) {
			const cost = source[i - 1] === target[j - 1] ? 0 : 1;

			matrix[i][j] = Math.min(
				matrix[i - 1][j] + 1,
				matrix[i][j - 1] + 1,
				matrix[i - 1][j - 1] + cost
			);

			if (
				i > 1 &&
				j > 1 &&
				source[i - 1] === target[j - 2] &&
				source[i - 2] === target[j - 1]
			) {
				matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
			}

			rowMin = Math.min(rowMin, matrix[i][j]);
		}

		if (rowMin > maxDistance) {
			return Number.POSITIVE_INFINITY;
		}
	}

	return matrix[rows - 1][cols - 1];
};

const damerauAgainstSegments = (value: string, normalizedQuery: string, maxDistance: number) => {
	if (!value) {
		return Number.POSITIVE_INFINITY;
	}

	let bestDistance = calculateDamerauLevenshteinDistance(value, normalizedQuery, maxDistance);
	if (bestDistance === 0) {
		return 0;
	}

	const tokens = tokenize(value);
	const queryLength = normalizedQuery.length;

	for (let start = 0; start < tokens.length; start += 1) {
		let segment = "";
		for (let end = start; end < tokens.length; end += 1) {
			segment = segment ? `${segment} ${tokens[end]}` : tokens[end];
			if (!segment.length) {
				continue;
			}

			if (Math.abs(segment.length - queryLength) > queryLength * 1.25) {
				if (segment.length > queryLength) {
					break;
				}
				continue;
			}

			const distance = calculateDamerauLevenshteinDistance(segment, normalizedQuery, maxDistance);
			if (distance < bestDistance) {
				bestDistance = distance;
				if (bestDistance === 0) {
					return 0;
				}
			}
		}
	}

	return bestDistance;
};

export const searchDamerauLevenshtein = (records: SearchableRecord[], query: string): SearchResult[] => {
	const normalized = normalize(query);

	if (!normalized) {
		return [];
	}

	const matches: SearchResult[] = [];
	const allowedDistance = Math.max(2, Math.ceil(normalized.length * 0.35));

	for (const record of records) {
		const title = normalize(record.title ?? "");
		const subtitle = normalize(record.subtitle ?? "");
		const author = normalize(record.author ?? "");
		const yearText = typeof record.year === "number" ? String(record.year) : "";

		const minDistance = Math.min(
			damerauAgainstSegments(title, normalized, allowedDistance),
			damerauAgainstSegments(subtitle, normalized, allowedDistance),
			damerauAgainstSegments(author, normalized, allowedDistance),
			damerauAgainstSegments(yearText, normalized, allowedDistance)
		);

		if (Number.isFinite(minDistance) && minDistance <= allowedDistance) {
			matches.push(
				formatRecord(record, {
					score: minDistance
				})
			);
		}
	}

	return matches;
};

