export interface Quote {
	text: string;
	author: string;
}

export const lordOfTheRingsQuotes: Quote[] = [
	{
		text: "All we have to decide is what to do with the time that is given us.",
		author: "Gandalf"
	},
	{
		text: "Even the smallest person can change the course of the future.",
		author: "Galadriel"
	},
	{
		text: "The world is not in your books and maps. It's out there.",
		author: "Gandalf"
	},
	{
		text: "It's a dangerous business, Frodo, going out your door.",
		author: "Bilbo Baggins"
	},
	{
		text: "The road goes ever on and on.",
		author: "Bilbo Baggins"
	}
];

export const getRandomQuote = (): Quote => {
	const randomIndex = Math.floor(Math.random() * lordOfTheRingsQuotes.length);
	return lordOfTheRingsQuotes[randomIndex];
};

