export type DICE = {
  name: string;
  type?: string;
  labels: string[];
  values: number[];
  inertia?: number;
  mass?: number;
  scale?: number;
  system?: string;
  setBumpMaps?: string[];
  colorset?: string;
  font?: string;
  display?: string;
}

export const DICE: Record<string, DICE> = {
	d2: {
		name: 'd2',
		labels: ['1','2'],
		values: [ 1,2 ],
		inertia: 8,
		mass: 400,
		scale: 0.9,
		system: 'dweird',
	},
	dc: {
		type: 'd2',
		name: 'Coin',
		labels: [
			'textures/silvercoin/tail.png',
			'textures/silvercoin/heads.png'
		],
		setBumpMaps: [ 
			'textures/silvercoin/tail_bump.png',
			'textures/silvercoin/heads_bump.png'
		],
		values: [ 0,1 ],
		inertia: 8,
		mass: 400,
		scale: 0.9,
		colorset: "coin_silver"
	},
	d1: {
		name: 'One-sided Dice',
		type: 'd6',
		labels: ['1'],
		values: [ 1,1 ],
		scale: 0.9,
		system: 'dweird',
	},

		/*d2', 'd6: {
		name: 'Two-Sided Dice',
		labels: ['1', '2'],
		values: [ 1,2 ],
		scale: 0.9,
		system: 'dweird',
	},*/

	d3: {
		name: 'Three-Sided Dice',
		type: 'd6',
		labels: ['1', '2', '3'],
		values: [ 1,3 ],
		scale: 0.9,
		system: 'dweird',
	},
	df: {
		name: 'Fudge Dice',
		type: 'd6',
		labels: ['-', '0', '+'],
		values: [ -1,1 ],
		scale: 0.9,
		system: 'dweird',
	},
	d4: {
		name: 'Four-Sided Dice',
		labels: ['1', '2', '3', '4'],
		values: [ 1,4 ],
		inertia: 5,
		scale: 1.2,
	},
	d6: {
		name: 'Six-Sided Dice (Numbers)',
		labels: ['1', '2', '3', '4', '5', '6'],
		values: [ 1,6 ],
		scale: 0.9,
	},
	dpip: {
		name: 'Six-Sided Dice (Pips)',
		type: 'd6',
		labels: [ '   \n ⬤ \n   ', '⬤  \n   \n  ⬤', '⬤  \n ⬤ \n  ⬤',
							'⬤ ⬤\n   \n⬤ ⬤', '⬤ ⬤\n ⬤ \n⬤ ⬤', '⬤ ⬤\n⬤ ⬤\n⬤ ⬤'],
		values: [ 1,6 ],
		scale: 0.9,
		font: 'monospace',
	},
	dsex: {
		name: 'Sex-Sided Emoji Dice',
		type: 'd6',
		labels: ['🍆', '🍑', '👌', '💦', '🙏', '💥'],
		values: [ 1,6 ],
		scale: 0.9,
		display: 'labels',
		system: 'dweird',
	},
	dpoker: {
		name: 'Poker Dice (9-Ace)',
		type: 'd6',
		labels: ['A', '9', '10', 'J', 'Q', 'K'],
		values: [ 1,6 ],
		scale: 0.9,
		display: 'labels',
		system: 'dweird',
		font: 'Times New Roman',
	},
	dspanpoker: {
		name: 'Spanish Poker Dice (7-Ace)',
		type: 'd8',
		labels: ['A', '7', '8', '9', '10', 'J', 'Q', 'K'],
		values: [ 1,8 ],
		display: 'labels',
		system: 'dweird',
		font: 'Times New Roman',
	},
	disotope: {
		name: 'Radioactive Twelve-Sided Dice',
		type: 'd12',
		labels: ['', '', '', '', '', '', '', '', '', '', '', '☢️'],
		values: [0,0,0,0,0,0,0,0,0,0,0,1],
		mass: 350,
		inertia: 8,
		scale: 0.9,
		system: 'dweird',
	},
	dsuit: {
		name: 'Four-Suited Dice',
		type: 'd4',
		labels: ['♠️', '♥️', '♦️', '♣️'],
		values: [ 1,4 ],
		inertia: 5,
		scale: 1.2,
		display: 'labels',
		system: 'dweird',
	},
	d8: {
		name: 'Eight-Sided Dice',
		labels: ['1', '2', '3', '4', '5', '6', '7', '8'],
		values: [ 1,8 ],
	},
	d10: {
		name: 'Ten-Sided Dice (Single Digit)',
		labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
		values: [ 1,10 ],
		mass: 350,
		inertia: 9,
		scale: 0.9,
	},
	d100: {
		name: 'Ten-Sided Dice (Tens Digit)',
		type: 'd10',
		labels: ['10', '20', '30', '40', '50', '60', '70', '80', '90', '00'],
		values: [ 10, 100, 10 ],
		mass: 350,
		inertia: 9,
		scale: 0.9,
	},
	d12: {
		name: 'Twelve-Sided Dice',
		labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
		values: [ 1,12 ],
		mass: 350,
		inertia: 8,
		scale: 0.9,
	},
	d20: {
		name: 'Twenty-Sided Dice',
		labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
		values: [ 1,20 ],
		mass: 400,
		inertia: 6,
	},
}

export const DICE_GEOM = {
	d4:{
		vertices:[[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]],
		faces:[[1, 0, 2, 1], [0, 1, 3, 2], [0, 3, 2, 3], [1, 2, 3, 4]],
	},
	d6: {
		vertices: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
		faces: [[0, 3, 2, 1, 1], [1, 2, 6, 5, 2], [0, 1, 5, 4, 3],[3, 7, 6, 2, 4], [0, 4, 7, 3, 5], [4, 5, 6, 7, 6]],
	},
	d8: {
		vertices: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
		faces: [[0, 2, 4, 1], [0, 4, 3, 2], [0, 3, 5, 3], [0, 5, 2, 4], [1, 3, 4, 5],[1, 4, 2, 6], [1, 2, 5, 7], [1, 5, 3, 8]],
	},
	d10: {
		vertices: [ [ 1, 0, -0.105 ],[ 0.809, 0.5877, 0.105 ],[ 0.309, 0.951, -0.105 ],[ -0.309, 0.951, 0.105 ],[ -0.809, 0.5877, -0.105 ],[ -1, 0, 0.105 ],[ -0.809, -0.587, -0.105 ],[ -0.309, -0.951, 0.105 ],[ 0.309, -0.951, -0.105 ],[ 0.809, -0.5877, 0.105 ],[ 0, 0, -1 ],[ 0, 0, 1 ] ],
		faces: [[5, 6, 7, 11, 0],[4, 3, 2, 10, 1],[1, 2, 3, 11, 2],[0, 9, 8, 10, 3],[7, 8, 9, 11, 4],[8, 7, 6, 10, 5],[9, 0, 1, 11, 6],[2, 1, 0, 10, 7],[3, 4, 5, 11, 8],[6, 5, 4, 10, 9]],
	},
	d12: {
		vertices: [[0, 0.618, 1.618], [0, 0.618, -1.618], [0, -0.618, 1.618], [0, -0.618, -1.618], [1.618, 0, 0.618],[1.618, 0, -0.618], [-1.618, 0, 0.618], [-1.618, 0, -0.618], [0.618, 1.618, 0], [0.618, -1.618, 0], [-0.618, 1.618, 0],[-0.618, -1.618, 0], [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1], [-1, 1, 1],[-1, 1, -1], [-1, -1, 1], [-1, -1, -1]],
		faces: [[2, 14, 4, 12, 0, 1], [15, 9, 11, 19, 3, 2], [16, 10, 17, 7, 6, 3], [6, 7, 19, 11, 18, 4],[6, 18, 2, 0, 16, 5], [18, 11, 9, 14, 2, 6], [1, 17, 10, 8, 13, 7], [1, 13, 5, 15, 3, 8],[13, 8, 12, 4, 5, 9], [5, 4, 14, 9, 15, 10], [0, 12, 8, 10, 16, 11], [3, 19, 7, 17, 1, 12]],
	},
	d20: {
		vertices: [[-1, 1.618, 0], [1, 1.618, 0 ], [-1, -1.618, 0], [1, -1.618, 0],[0, -1, 1.618], [0, 1, 1.618], [0, -1, -1.618], [0, 1, -1.618],[1.618, 0, -1], [1.618, 0, 1], [-1.618, 0, -1], [-1.618, 0, 1]],
		faces: [[0, 11, 5, 1], [0, 5, 1, 2], [0, 1, 7, 3], [0, 7, 10, 4], [0, 10, 11, 5],[1, 5, 9, 6], [5, 11, 4, 7], [11, 10, 2, 8], [10, 7, 6, 9], [7, 1, 8, 10],[3, 9, 4, 11], [3, 4, 2, 12], [3, 2, 6, 13], [3, 6, 8, 14], [3, 8, 9, 15],[4, 9, 5, 16], [2, 4, 11, 17], [6, 2, 10, 18], [8, 6, 7, 19], [9, 8, 1, 20]],
	}
}