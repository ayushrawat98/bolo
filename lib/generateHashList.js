import {instance} from "../db/db.js"
//user generated boards
export default function generateHashList(list, skip = false) {
	const allThreadList = list ?? instance.getUpdateSortedParentPosts()
	//get hash of all topics
	let allHash = new Set()
	allThreadList.forEach(thread => {
		allHash.add(thread.board)
	})
	//if 'random' present, remove it
	if (allHash.has('random')) allHash.delete('random');

	return [...allHash];
}