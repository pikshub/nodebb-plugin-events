"use strict";
/*global socket, ajaxify, RELATIVE_PATH, utils, translator, templates*/

$('document').ready(function() {
	//todo: experiment with pre-loading this info on ajaxify.start
	$(window).on('action:ajaxify.end', function(err, data) {
		var url = data.url, tid;

		if (tid = data.url.match(/^topic\/(\d*)/)) {
			getTopicEvents({tid: tid[1]});
		} else if (data.url.match(/^user\//)) {
			getUserEvents();
		}
	});

	$(window).on('action:posts.loaded', getTopicEvents);

	socket.on('event:topic_pinned', getTopicEvents);
	socket.on('event:topic_unpinned', getTopicEvents);
	socket.on('event:topic_locked', getTopicEvents);
	socket.on('event:topic_unlocked', getTopicEvents);
	socket.on('event:topic_moved', getTopicEvents);

	function getUserEvents(data) {
		var uid = ajaxify.variables.get('theirid');

		$.get(RELATIVE_PATH + '/api/events/uid/' + uid, function(events) {
			$.each(events, function(idx, data) {
				var timestamp = utils.toISOString(data.timestamp),
					str;

				switch(data.eventType) {
				case 'followed' :
				case 'following' :
					str = 'events:user.' + data.eventType;
					var fromUserUrl = RELATIVE_PATH + '/user/' + data.fromUserslug,
						toUserUrl = RELATIVE_PATH + '/user/' + data.toUserslug;

					data.content = translator.compile(str, fromUserUrl, data.fromUsername, toUserUrl, data.toUsername);
					data.class = 'info';

					break;
				default :
					return true;
				}
				
				// createUserEventRow(data, idx);
			});
		});
	}

	function getTopicEvents(data) {
		var tid = data.tid || ajaxify.variables.get('topic_id');

		$.get(RELATIVE_PATH + '/api/events/tid/' + tid, function(events) {
			$.each(events, function(idx, data) {
				var timestamp = utils.toISOString(data.timestamp),
					userUrl = RELATIVE_PATH + '/user/' + data.userslug,
					str;

				switch (data.eventType) {
				case 'pinned' :
				case 'unpinned' :
					str = 'events:topic.' + data.eventType;

					data.content = translator.compile(str, userUrl, data.username, timestamp);
					data.class = data.eventType === 'pinned' ? 'success' : 'warning';
					break;
				case 'locked' :
				case 'unlocked' :
					str = 'events:topic.' + data.eventType;

					data.content = translator.compile(str, userUrl, data.username, timestamp);
					data.class = data.eventType === 'locked' ? 'success' : 'warning';
					break;
				case 'move' :
					var fromSlug = RELATIVE_PATH + '/category/' + data.fromCategorySlug,
						toSlug =  RELATIVE_PATH + '/category/' + data.toCategorySlug;

					data.content = translator.compile('events:topic.moved', userUrl, data.username, fromSlug, data.fromCategoryName, toSlug, data.toCategoryName, timestamp);
					data.class = 'info';
					break;
				default :
					return true;
				}

				if ($('.events-topic[data-timestamp="' + data.timestamp + '"]').length) {
					return true;
				}

				createTopicEventRow(data, idx);
			});
		});
	}

	function createTopicEventRow(data, idx) {
		// the async nature of this function causes occasional hiccups on the placing of events
		templates.parse('events/topic', data, function(tpl) {
			translator.translate(tpl, function(content) {

				var rows = $('li.post-row');
				rows.each(function(idx) {
					var $this = $(this),
						nextRow = rows.eq(idx + 1),
						nextRowTimestamp = nextRow.attr('data-timestamp') ? nextRow.attr('data-timestamp') : data.timestamp + 1;

					if ($this.attr('data-timestamp') < data.timestamp && nextRowTimestamp > data.timestamp) {
						var contentEl;
						if (nextRow.length) {
							contentEl = $(content).insertBefore(nextRow);
						} else {
							contentEl = $(content).appendTo($this.parent());
						}

						contentEl.find('.timeago').timeago();

						contentEl.prev().addClass('events-topic-before');
						if (!contentEl.next().length) {
							$('.bottom-post-bar').addClass('events-topic-after');
						} else {
							contentEl.next().addClass('events-topic-after')	;
						}
						
						return false;
					}
				});
			});
		});
	}
});
