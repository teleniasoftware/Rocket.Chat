import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';

import { LivechatVisitors } from '../../../models';
import { Livechat } from '../lib/Livechat';

Meteor.methods({
	sendMessageLivechat({ token, _id, rid, msg, file, attachments, custom_values }, agent) {
		check(token, String);
		check(_id, String);
		check(rid, String);
		check(msg, String);

		check(agent, Match.Maybe({
			agentId: String,
			username: String,
		}));

		const guest = LivechatVisitors.getVisitorByToken(token, {
			fields: {
				name: 1,
				username: 1,
				department: 1,
				token: 1,
			},
		});

		if (!guest) {
			throw new Meteor.Error('invalid-token');
		}
		console.debug("##Telenia_Rocket## sendMessageLivechat with custom_values: ", custom_values);
		return Livechat.sendMessage({
			guest,
			message: {
				_id,
				rid,
				msg,
				token,
				file,
				attachments,
			},
			agent,
			custom_values
		});
	},
});
