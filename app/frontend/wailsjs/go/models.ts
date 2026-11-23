export namespace main {
	
	export class Item {
	    id: number;
	    name: string;
	    category: string;
	    have: number;
	    need: number;
	
	    static createFrom(source: any = {}) {
	        return new Item(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.category = source["category"];
	        this.have = source["have"];
	        this.need = source["need"];
	    }
	}
	export class Player {
	    path: string;
	    name: string;
	    file: string;
	    cloud: boolean;
	    journey: boolean;
	    ok: boolean;
	    modified: number;
	
	    static createFrom(source: any = {}) {
	        return new Player(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.file = source["file"];
	        this.cloud = source["cloud"];
	        this.journey = source["journey"];
	        this.ok = source["ok"];
	        this.modified = source["modified"];
	    }
	}
	export class Research {
	    path: string;
	    name: string;
	    items: Item[];
	
	    static createFrom(source: any = {}) {
	        return new Research(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.items = this.convertValues(source["items"], Item);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Status {
	    state: string;
	    reason: string;
	    message: string;
	    terrariaDir: string;
	    version: string;
	
	    static createFrom(source: any = {}) {
	        return new Status(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.state = source["state"];
	        this.reason = source["reason"];
	        this.message = source["message"];
	        this.terrariaDir = source["terrariaDir"];
	        this.version = source["version"];
	    }
	}

}

