import { ReadReceipt } from './lib/ReadReceipt';
import { callbacks } from '../../../app/callbacks';
import { Subscriptions } from '../../../app/models';

callbacks.add('afterSaveMessage', (message, room) => {
	// skips this callback if the message was edited
	if (message.editedAt) {
		return message;
	}

	if (room && !room.closedAt) {
		// set subscription as read right after message was sent
		console.log("##Telenia_Rocket## not closedAt afterSaveMessage");
		Subscriptions.setAsReadByRoomIdAndUserId(room._id, message.u._id);
	}

	// mark message as read as well

	console.log("##Telenia_Rocket##  afterSaveMessage callback message-read-receipt-afterSaveMessage", message, room);
	ReadReceipt.markMessageAsReadBySender(message, room._id, message.u._id);
}, callbacks.priority.MEDIUM, 'message-read-receipt-afterSaveMessage');

callbacks.add('afterReadMessages', (rid, { userId, lastSeen }) => {

	console.log("##Telenia_Rocket##  afterReadMessages callback");
	ReadReceipt.markMessagesAsRead(rid, userId, lastSeen);
}, callbacks.priority.MEDIUM, 'message-read-receipt-afterReadMessages');


// Custom method by Alessandro Valentino
callbacks.add('afterReadLivechatMessages', (rid, _ref) => {
	let {
	  userId
	} = _ref;

	console.log("Customization: afterReadLivechatMessages");
	ReadReceipt.markLivechatMessagesAsRead(rid, userId);
  }, callbacks.priority.MEDIUM, 'message-read-receipt-afterReadLivechatMessages');
