import {DICE, DICE as DiceType} from "./const/dice"

const defaults = {
	name: '',
	scale: 1,
	font: 'Arial',
	color: '',
	labels: [],
	valueMap: [],
	values: [],
	normals: [],
	mass: 300,
	inertia: 13,
	geometry: null,
	display: 'values',
	system: 'd20',
}

export class DicePreset {
  shape: string | null = null;
  type: string | null = null;
  values: number[] = [];
  labels: number[][][] = [];
  normals: number[][][] = [];

  constructor(name: keyof typeof DICE) {
    if(!DICE.hasOwnProperty(name)){
			console.error("dice type unavailable");
      return;
		}
    Object.assign(this, defaults, DICE[name]);

    this.shape = DICE[name]?.type || name;
    this.type = DICE[name]?.type || name;
  }

  setValues(min = 1, max = 20, step = 1) {
		this.values = this.range(min, max, step);
	}

  range(min: number, max: number, step: number) {
		return Array.from({length: (max - min) / step + 1}, (_, i) => min + i * step);
	}

  setLabels(labels: string[]) {
		this.loadTextures(labels, this.registerFaces.bind(this), "labels");
	}

  setBumpMaps(normals: string[]){
		this.loadTextures(normals,this.registerFaces.bind(this),"bump");
	}
  registerFaces(faces: number[][][], type: "labels" | "bump" = "labels"){
		let tab;

		if (type == "labels") {
			tab = this.labels;
		} else {
			tab = this.normals;
		}
		
		tab.unshift('');
		if(!["d2","d10"].includes(this.shape ?? '')) tab.unshift('');

		if (this.shape == 'd4') {

			let a = faces[0];
			let b = faces[1];
			let c = faces[2];
			let d = faces[3];

			this.labels = [
				[[], [0, 0, 0], [b, d, c], [a, c, d], [b, a, d], [a, b, c]],
				[[], [0, 0, 0], [b, c, d], [c, a, d], [b, d, a], [c, b, a]],
				[[], [0, 0, 0], [d, c, b], [c, d, a], [d, b, a], [c, a, b]],
				[[], [0, 0, 0], [d, b, c], [a, d, c], [d, a, b], [a, c, b]]
			];
		} else {
			Array.prototype.push.apply(tab, faces)
		}
	}

  loadTextures(textures: string[], callback: (imgElements: HTMLImageElement[], type: string) => void, type: string) {
		let loadedImages = 0;
		let numImages = textures.length;
		let regexTexture = /\.(PNG|JPG|GIF|WEBP)$/i;
		let imgElements=Array(textures.length);
		let hasTextures = false;
		for (let i = 0;i<numImages;i++) {
			if(textures[i] == '' || !textures[i].match(regexTexture)) {
				imgElements[i] = textures[i];
				++loadedImages
				continue;
			}
			hasTextures = true;
			imgElements[i] = new Image();
			imgElements[i].onload = function() {
	
				if (++loadedImages >= numImages) {
					callback(imgElements,type);
				}
			};
			imgElements[i].src = textures[i];
		}
		if(!hasTextures)
			callback(imgElements,type);
	}
}