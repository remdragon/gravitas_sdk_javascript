export class $Error extends Error {
	constructor( error = '', ...params ) {
		error = (error + '').replace( /<br>/g, '\n' )
		super( error, ...params )
		this.name = this.constructor.name
	}
}

export class Exception extends $Error {}

export class IndexError extends $Error {}

export class KeyError extends $Error {}

export class ValueError extends $Error{}

export class NotImplementedError extends $Error {}

export class AssertionError extends $Error {}

export class FormatedError extends $Error
{
	constructor(kwargs) {
		kwargs = {
			error: '',
			...kwargs
		}
		const { error } = kwargs
		super( error instanceof $Error? error.message:error )
		for( let key in kwargs ) {
			const value = kwargs[key]
			if( key in this)
				key = '_' + key
			this[key] = value
		}
		if( error instanceof $Error )
			this.stack = error.stack
	}

	toString()
	{
		return this.error
	}
}

export class RequestError extends $Error
{
	ignore_attrs = []
	constructor( data, stack, ...params )
	{
		super(...params)
		for( let attr in data ) {
			if( this.ignore_attrs.includes( attr ) )
				continue
			this[attr] = data[attr]
		}
		if( data && data.hasOwnProperty( 'name' ) && data.name )
			this.name = `${this.constructor.name}[${data.name}]`
		
		if( stack ) {
			let stackarr = this.stack.split('\n')
			stackarr.splice(1, stackarr.length - 1)
			this.stack = stackarr.join('\n') + '\n' + params.join('\n') + '\n' + stack
		}
	}
}