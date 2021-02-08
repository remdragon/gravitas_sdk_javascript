// by: carl
// just a wrapper for `fetch` API that throws an error base on response

const _fetch_ = async ( url, params ) => {
	try {
		const response = await fetch ( url, params )
		try { var body = await response.clone().json() }
		catch { var body = await response.text() }
		if ( !response.ok ) {
			const { status, statusText } = response
			throw new Error (
				`${statusText} (${status})${body ? ': ' + body.error || JSON.stringify(body) : ''}`
			)
		}
		else return body
	} catch ( err ) { throw err }
}
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
		/* istanbul ignore next */
		if ( typeof paramArgs === 'undefined' || paramArgs === null )
			paramArgs =  new HTTPCRUDParams()

		var params = {}
		switch ( method.toUpperCase() ) {
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

		try { return await _fetch_ ( `${this.host}/rest/${endpoint}`, params ) }
		catch ( e ) { throw new HTTPJSONValueError( e.message ) }
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

	async connect ()
	{
		// This function does nothing...
		// Just to make the HTTPCRUD class similar to WSSCRUD
	}
}

export class WSSCRUD
{
	constructor ( url )
	{
		this.url = url
		this.eventcallbacks = {}
		this.replycallbacks = {}
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

				 // TODO: not all packets will have an id
				if( data.id ) {
					let id = data.id
					let replycallback = this.replycallbacks[id] // TODO: need to remove from dictionary
					
					if ( data.success )
					{
						// console.log ( `callback.resolve ( data ) = ${JSON.stringify(data)}` )
						replycallback.resolve ( data )
					}
					else
					{
						// console.log ( `callback.reject ( data ) = ${JSON.stringify(data)}` )
						let result = {}
						if ( data.status === 400)
						{
							result = {
								id: data.id,
								error: data.error,
								status: data.status
							}
						}
						replycallback.reject ( result )
					}
				} else {

					try {
						this.eventcallbacks[data.type][data.command]( data.rows )
					} catch ( e ) {
						console.log("WS Event Call Back", e)
					}
					
				}
			}
		} )
	}

	AddEventCallback(type, functions) 
	{
		if( !this.eventcallbacks[type] ) {
			this.eventcallbacks[type] = functions
		} else {
			if( typeof(functions) == 'object')
				this.eventcallbacks[type] = this.eventcallbacks[type].concat(functions)
			else
				this.eventcallbacks[type].append(functions)
		}
		
		return this.eventcallbacks[type]
	}

	RemoveEventCallback(type)
	{
		delete this.eventcallbacks[type]
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
				paramArgs =  new HTTPCRUDParams()

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
			this.replycallbacks[request.id] = {
				resolve: resolve,
				reject: resolve
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
			params
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
