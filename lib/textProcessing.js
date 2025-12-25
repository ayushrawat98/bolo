import { sanitizeInput } from './sanitize.js'
import { h32 } from 'xxhashjs';
import generateHashList from './generateHashList.js';

function hashBoard(req, res, next) {
	const hashReg = /#([A-Za-z][A-Za-z0-9]{0,15})/;
	let matchedValue = req.sanitizedBody.content.match(hashReg)
	let userDeclaredBoard = 'random'
	if (matchedValue) {
		userDeclaredBoard = matchedValue[1]
	}else if (req.query.type && typeof req.query.type === 'string' && sanitizeInput(req.query.type).length > 0 && hashListMaker(req.query.type)) {
		userDeclaredBoard = sanitizeInput(req.query.type)
	}
	req.sanitizedBody.board = userDeclaredBoard
	// console.log(userDeclaredBoard)
	next()
}

function hashName(req, res, next) {
	let computedUsername = req.sanitizedBody.name
	if (computedUsername.length > 0) {
		let hashArray = computedUsername.split('@')
		if (hashArray.length > 1) {
			let first = hashArray.shift()
			let second = h32(hashArray.join(''), 1).toString(16)
			computedUsername = `${first}@${second}`
		}
	}
	req.sanitizedBody.hashName = computedUsername.length > 0 ? computedUsername : 'Anonymous'
	next()
}

function hashListMaker(board) {
	let allHash = generateHashList(undefined, true)
	return allHash.includes(board)
}

export { hashBoard, hashName }