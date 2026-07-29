export type ExperienceJob = {
	id: string;
	company: string;
	title: string;
	dates: string;
	accent: 'secondary' | 'tertiary' | 'quaternary';
	bullets: [string, string];
	tech: string;
	stackIndex: number;
};

export const experienceJobs: ExperienceJob[] = [
	{
		id: 'experience-tile-paycom',
		company: 'Paycom',
		title: 'Software Engineer',
		dates: 'May 2021 – Jan 2023',
		accent: 'quaternary',
		bullets: [
			'Scheduling SPA in React and Redux',
			'Legacy PHP performance wins up to 80%',
		],
		tech: 'React · Redux · PHP · Jest',
		stackIndex: 0,
	},
	{
		id: 'experience-tile-performyard',
		company: 'PerformYard',
		title: 'React Guild Lead',
		dates: 'Jan 2023 – Mar 2026',
		accent: 'tertiary',
		bullets: [
			'Guild Lead; component library and form system',
			'Test coverage 10% → 60%; React 15 → 19',
		],
		tech: 'TypeScript · React · Fastify · Zod',
		stackIndex: 1,
	},
	{
		id: 'experience-tile-bd',
		company: 'Boston Dynamics',
		title: 'Staff Software Engineer',
		dates: 'Mar 2026 – Present',
		accent: 'secondary',
		bullets: [
			'Stretch Web Interface with Three.js',
			'OTA cloud infra and agentic flows',
		],
		tech: 'React · Three.js · Express · Bazel',
		stackIndex: 2,
	},
];

export const experienceJobsByRecency = [...experienceJobs].sort(
	(a, b) => b.stackIndex - a.stackIndex,
);
