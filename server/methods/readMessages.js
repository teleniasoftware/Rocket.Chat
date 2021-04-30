import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { callbacks } from '../../app/callbacks';
import { Subscriptions, ReadReceipts, Messages, Rooms, Users, LivechatVisitors } from '../../app/models';

Meteor.methods({
	readMessages(rid) {
		check(rid, String);

		const userId = Meteor.userId();

		const room = Promise.await(Rooms.findOneById(rid));
		if(!room){
			console.debug("##Telenia_Rocket## readMessages(rid) - could not find room with id " + rid);
		}

		if(room.t !== 'l'){
			console.debug("##Telenia_Rocket## readMessages method");

			if (!userId) {
				throw new Meteor.Error('error-invalid-user', 'Invalid user', {
					method: 'readMessages',
				});
			}

			callbacks.run('beforeReadMessages', rid, userId);

			// TODO: move this calls to an exported function
			const userSubscription = Subscriptions.findOneByRoomIdAndUserId(rid, userId, { fields: { ls: 1 } });

			if (!userSubscription) {
				throw new Meteor.Error('error-invalid-subscription', 'Invalid subscription', {
					method: 'readMessages',
				});
			}

			Subscriptions.setAsReadByRoomIdAndUserId(rid, userId);

			Meteor.defer(() => {
				callbacks.run('afterReadMessages', rid, { userId, lastSeen: userSubscription.ls });
			});
		}else if(room.t === 'l'){
			console.log("Customization: readMessages for livechat");
			const userSubscription = Subscriptions.findOneByRoomIdAndUserId(rid, userId, {
			  fields: {
				v: 1
			  }
			});

			if (!userSubscription) {
			  throw new Meteor.Error('error-invalid-subscription', 'Invalid subscription', {
				method: 'readMessages'
			  });
			}

			Meteor.defer(() => {
			  callbacks.run('afterReadLivechatMessages', rid, {
				userId: userSubscription.v._id
				// lastSeen: userSubscription.ls
			  });
			});
		  }
		},
		// Custom modification by Alessandro Valentino
		// This method is used by the visitor to set as read the agent's messages
		// Visitor info must contain visitorId & visitorUsername
		// visitorInfo = {
		//    visitorUserid: "....",
		//    visitorUsername: "...."
		// }
		readAgentMessages(rid, visitorInfo) {
		  console.log("Customization: readAgentMessages prima");
		  check(rid, String);
		  let userId = "";

		  // const room = Promise.await(Rooms.findOneById(rid));

		  console.log("Customization: readAgentMessages");

		  // callbacks.run('beforeReadMessages', rid, userId);

		  const userSubscription = Subscriptions.findOneByRoomIdAndVisitorUserId(rid, visitorInfo.visitorUserId, {
			fields: {
			  u: 1
			}
		  });

		  console.log("Customization: readAgentMessages - retreived subscription -> ", userSubscription);
		  if (!userSubscription) {
			throw new Meteor.Error('error-invalid-subscription', 'Invalid subscription', {
			  method: 'readMessages'
			});
		  }
		  userId = userSubscription.u._id;

		  // Subscriptions.setAsReadByRoomIdAndUserId(rid, userId); // We should skip this
		  Meteor.defer(() => {
			callbacks.run('afterReadLivechatMessages', rid, {
			  userId
			  // lastSeen: userSubscription.ls
			});
		  });
	},
});
