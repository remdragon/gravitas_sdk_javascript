const jsonBodyNull = null
const paramsNull = null

class HTTPJSONValueError extends Error {
	constructor ( responseText ) {
		super ( responseText )
	}
}

export class HTTPCRUDParams {
	/**
	 * @param {Object|null|undefined} params query string params
	 * @param {Object|null|undefined} jsonBody
	 */
	constructor( params, jsonBody ) {
		this.params = params
		this.jsonBody = jsonBody
	}
}

export class HTTPCRUD {
	
	/**
	 * @param {String} host
	 * @param {Boolean} sslVerifyEnabled
	 * @param {Boolean|undefined} testMode
	 * 
	 * */
	constructor( host, sslVerifyEnabled, testMode ) {
		this.host = host
		this.sslVerifyEnabled = sslVerifyEnabled
		this.testMode = testMode || false
	}
	
	/**
	 * 
	 * @param {String} method get, post, delete, etc
	 * @param {String} endpoint
	 * @param {HTTPCRUDParams} paramArgs
	 */
	async _request( method, endpoint, paramArgs ) {
		const uri = `${this.host}/rest/${endpoint}/`
		/* istanbul ignore next */
		if ( typeof paramArgs === 'undefined' || paramArgs === null )
			paramArgs = HTTPCRUDParams()
		
		try {
			var params = {}

			switch (method.toUpperCase())
			{
				case 'GET':
					params = {
						method: method, 
						headers: { 'Content-Type': 'application/json' },
					}
					break

				case 'POST':
				case 'PATCH':
				case 'DELETE':
					params = {
						method: method, 
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(paramArgs),
					}
					break
            }
            
            let result

            await fetch ( uri, params ) 
                .then( response => {
                    if ( response.ok ) {
                        return response.json()
                    } 
                    else 
                    {
                        if ( response.status == 404 ) {
                            return { success: false, error: `Invalid URL: ${uri}` }
                        } else {
                            return { success: false, error: response.statusText }
                        }
                    }
                })
                .then ( data => {
                    result = data
                } )
                .catch ( e => {
			        throw new HTTPJSONValueError( `fetch.catch: ${e}` );
                } )

            console.log( `result = data = ${JSON.stringify(result)}`)
			return result
		}
		catch ( e ) {
			throw new HTTPJSONValueError( e.message );
		}
    }
	
	/**
	 * @param {String} endpoint
	 * @param {Object} params
	 */
	async create ( endpoint, params ) {
		return await this._request(
			'post',
			endpoint,
			params
		);
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} params
	 */
	async read ( endpoint, params ) {
		return await this._request(
			'get',
			endpoint,
			params,
		);
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} params
	 */
	async update ( endpoint, params ) {
		return await this._request(
			'patch',
			endpoint,
			params,
		);
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} params
	 */
	async delete ( endpoint, params ) {
		return await this._request(
			'delete',
			endpoint,
			params,
		);
	}
}

export class WSSCRUD
{
	constructor ( url )
	{
		this.url = url
		this.callbacks = {}
	}

	generateId = () => {
		let result = Math.random().toString()
		return result.replace(/\./g,'')
	}

	async connect() {

		return new Promise ( ( resolve, reject ) => {

			this.wss = new WebSocket ( this.url )  

			this.wss.onopen = ( event ) => {
				resolve ( event )
			}

			this.wss.onerror = ( event ) => {
				reject ( event )
			}

			this.wss.onmessage = ( event ) => {
				let data = JSON.parse ( event.data )

				let id = data.id // TODO: not all packets will have an id
				let callback = this.callbacks[id] // TODO: need to remove from dictionary

				if ( data.success )
				{
                    console.log ( `callback.resolve ( data ) = ${JSON.stringify(data)}` )
					callback.resolve ( data )
				}
				else
				{
                    console.log ( `callback.reject ( data ) = ${JSON.stringify(data)}` )

                    let result = {}
                    if ( data.status === 400)
                    {
                        result = {
                            id: data.id,
                            error: "Bad request",
                            status: data.status
                        }   
                    }
					callback.reject ( result )
				}
			}
		} )
	}

	/**
	 * 
	 * @param {String} method get, post, delete, etc
	 * @param {String} endpoint
	 * @param {HTTPCRUDParams} paramArgs
	 */
	async _request ( method, endpoint, paramArgs ) {

		return new Promise ( ( resolve, reject ) => {

			if ( typeof paramArgs === 'undefined' || paramArgs === null )
				paramArgs = HTTPCRUDParams()

            let request = {}

            switch (method.toUpperCase())
			{
				case 'GET':
					request = {
                        id: this.generateId(),
                        method: method,
                        path: `/rest/${endpoint}/`
                    }
					break

				case 'POST':
				case 'PATCH':
				case 'DELETE':
					request = {
                        id: this.generateId(),
                        method: method,
                        path: `/rest/${endpoint}/`,
                        body: paramArgs
                    }
					break
			}
			this.callbacks[request.id] = {
				resolve: resolve,
				reject: reject
			}
			this.wss.send ( JSON.stringify( request ) + '\n' )
		} )
	}

	/**
	 * @param {String} endpoint
	 * @param {Object} params
	 */
	async create ( endpoint, params ) {
		return await this._request(
			'post',
			endpoint,
			params,
		);
	}

	/**
	 * @param {String} endpoint
	 * @param {Object} params
	 */
	async read ( endpoint, params ) {
		return await this._request(
			'GET',
			endpoint,
			params,
		);
	}

	/**
	 * @param {String} endpoint
	 * @param {Object} params
	 */
	async update ( endpoint, params ) {
		return await this._request(
			'PATCH',
			endpoint,
			params
		);
	}

	/**
	 * @param {String} endpoint
	 * @param {Object} params
	 */
	async delete ( endpoint, params ) {
		return await this._request(
			'DELETE',
			endpoint,
			params
		);
	}
}
