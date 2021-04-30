import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';

import { ReadReceipts, Subscriptions, Messages, Rooms, Users, LivechatVisitors } from '../../../../app/models';
import { settings } from '../../../../app/settings';
import { roomTypes } from '../../../../app/utils';

const rawReadReceipts = ReadReceipts.model.rawCollection();

// debounced function by roomId, so multiple calls within 2 seconds to same roomId runs only once
const list = {};
const debounceByRoomId = function(fn) {
	return function(roomId, ...args) {
		clearTimeout(list[roomId]);
		list[roomId] = setTimeout(() => { fn.call(this, roomId, ...args); }, 2000);
	};
};

const updateMessages = debounceByRoomId(Meteor.bindEnvironment(({ _id, lm }) => {
	// @TODO maybe store firstSubscription in room object so we don't need to call the above update method
	const firstSubscription = Subscriptions.getMinimumLastSeenByRoomId(_id);
	if (!firstSubscription) {
		return;
	}

	console.debug("##Telenia_Rocket## updateMessages");
	Messages.setAsRead(_id, firstSubscription.ls);

	if (lm <= firstSubscription.ls) {
		Rooms.setLastMessageAsRead(_id);
	}
}));

// Custom modification by Alessandro Valentino
const updateLivechatMessages = debounceByRoomId(Meteor.bindEnvironment((_ref) => {
	let {
	  rid,
	  userId
	} = _ref;
	// @TODO maybe store firstSubscription in room object so we don't need to call the above update method
	// const firstSubscription = Subscriptions.getMinimumLastSeenByRoomId(_id);

	// if (!firstSubscription) {
	//   return;
	// }

	console.log("Customization: updateLivechatMessages. Room id -> " + rid + " | User id: " + userId);
	const modifiedMessages = Messages.setLivechatMessagesAsRead(rid, userId);
	console.log("Customization: updateLivechatMessages. Modified messages -> " + modifiedMessages);

	// if (lm <= firstSubscription.ls) {
	//   Rooms.setLastMessageAsRead(_id);
	// }
}));

export const ReadReceipt = {
	markMessagesAsRead(roomId, userId, userLastSeen) {
		if (!settings.get('Message_Read_Receipt_Enabled')) {
			return;
		}

		console.debug("##Telenia_Rocket## markMessagesAsRead");

		const room = Rooms.findOneById(roomId, { fields: { lm: 1 } });

		// if users last seen is greadebounceByRoomIdter than room's last message, it means the user already have this room marked as read
		if (userLastSeen > room.lm) {
			return;
		}

		if (userLastSeen) {
			this.storeReadReceipts(Messages.findUnreadMessagesByRoomAndDate(roomId, userLastSeen), roomId, userId);
		}

		updateMessages(room);
	},

	// Custom method by Alessandro Valentino
	markLivechatMessagesAsRead(roomId, userId) {

		if (!settings.get('Message_Read_Receipt_Enabled')) {
		  return;
		}

		console.log("Customization: markLivechatMessagesAsRead");

		const room = Rooms.findOneById(roomId, {
		  fields: {
			lm: 1
		  }
		});

		this.storeReadReceipts(Messages.findUnreadMessagesByRoomAndUserId(roomId, userId), roomId, userId);


		updateLivechatMessages({
		  rid: roomId,
		  userId
		});
	},

	markMessageAsReadBySender(message, roomId, userId) {
		if (!settings.get('Message_Read_Receipt_Enabled')) {
			return;
		}

		// this will usually happens if the message sender is the only one on the room
		console.debug("##Telenia_Rocket## markMessageAsReadBySender ", roomId);
    	const firstSubscription = Subscriptions.getMinimumLastSeenByRoomId(roomId);
		// if (firstSubscription && message.unread && message.ts < firstSubscription.ls) {
		// 	Messages.setAsReadById(message._id, firstSubscription.ls);
		// }

		const room = Rooms.findOneById(roomId, { fields: { t: 1 } });

		if (firstSubscription && message.unread && message.ts < firstSubscription.ls && room.t !== "l") {
			console.debug("##Telenia_Rocket## 'firstSubscription && message.unread && message.ts < firstSubscription.ls && room.t !== 'l''", firstSubscription, message);
			Messages.setAsReadById(message._id, firstSubscription.ls);
		}

		const extraData = roomTypes.getConfig(room.t).getReadReceiptsExtraData(message);

		this.storeReadReceipts([{ _id: message._id }], roomId, userId, extraData);
	},

	storeReadReceipts(messages, roomId, userId, extraData = {}) {
		if (settings.get('Message_Read_Receipt_Store_Users')) {
			const ts = new Date();
			const receipts = messages.map((message) => ({
				_id: Random.id(),
				roomId,
				userId,
				messageId: message._id,
				ts,
				...extraData,
			}));

			if (receipts.length === 0) {
				return;
			}

			try {
				rawReadReceipts.insertMany(receipts);
			} catch (e) {
				console.error('Error inserting read receipts per user');
			}
		}
	},

	getReceipts(message) {
		return ReadReceipts.findByMessageId(message._id).map((receipt) => ({
			...receipt,
			user: receipt.token ? LivechatVisitors.getVisitorByToken(receipt.token, { fields: { username: 1, name: 1 } }) : Users.findOneById(receipt.userId, { fields: { username: 1, name: 1 } }),
		}));
	},
};
