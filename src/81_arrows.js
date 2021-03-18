"use strict";

function DrawArrows(node, one_click_moves, specific_source, show_move) {		// specific_source is a Point(), show_move is a string

	// Function is responsible for updating the one_click_moves array.

	for (let x = 0; x < 8; x++) {
		for (let y = 0; y < 8; y++) {
			one_click_moves[x][y] = null;
		}
	}

	if (!config.arrows_enabled || !node || node.destroyed) {
		return;
	}

	let full_list = SortedMoveInfo(node);

	if (full_list.length === 0) {		// Keep this test early so we can assume full_list[0] exists later.
		return;
	}

	let best_info = full_list[0];		// Note that, since we may filter the list, it might not contain best_info later.

	let info_list = [];
	let arrows = [];
	let heads = [];

	let mode;
	let show_move_was_forced = false;	// Will become true if the show_move is only in the list because of the show_move arg
	let show_move_head_exists = false;

	if (specific_source) {
		mode = "specific";
	} else if (full_list[0].__ghost) {
		mode = "ghost";
	} else if (full_list[0].__touched === false) {
		mode = "untouched";
	} else if (full_list[0].leelaish === false) {
		mode = "ab";
	} else {
		mode = "normal";
	}

	switch (mode) {

	case "normal":

		info_list = full_list;
		break;

	case "ab":

		for (let info of full_list) {
			if (info.__touched && info_list.length < config.ab_engine_multipv) {
				info_list.push(info);
			} else if (info.move === show_move) {
				info_list.push(info);
				show_move_was_forced = true;
			}
		}
		break;

	case "ghost":

		for (let info of full_list) {
			if (info.__ghost) {
				info_list.push(info);
			} else if (info.move === show_move) {
				info_list.push(info);
				show_move_was_forced = true;
			}
		}
		break;

	case "untouched":

		for (let info of full_list) {
			if (info.move === show_move) {
				info_list.push(info);
				show_move_was_forced = true;
			}
		}
		break;

	case "specific":

		for (let info of full_list) {
			if (info.move.slice(0, 2) === specific_source.s) {
				info_list.push(info);
			}
		}
		break;

	}

	// ------------------------------------------------------------------------------------------------------------

	for (let i = 0; i < info_list.length; i++) {

		let loss = 0;

		if (typeof best_info.q === "number" && typeof info_list[i].q === "number") {
			loss = best_info.value() - info_list[i].value();
		}

		let ok = true;

		// Filter for normal / ghost / untouched mode...

		if (mode !== "ab" && mode !== "specific") {

			if (config.arrow_filter_type === "top") {
				if (i !== 0) {
					ok = false;
				}
			}

			if (config.arrow_filter_type === "N") {
				if (typeof info_list[i].n !== "number" || info_list[i].n === 0) {
					ok = false;
				} else {
					let n_fraction = info_list[i].n / node.table.nodes;
					if (n_fraction < config.arrow_filter_value) {
						ok = false;
					}
				}
			}

			// Moves proven to lose...

			if (typeof info_list[i].u === "number" && info_list[i].u === 0 && info_list[i].value() === 0) {
				if (config.arrow_filter_type !== "all") {
					ok = false;
				}
			}

			// If the show_move would be filtered out, note that fact...

			if (!ok && info_list[i].move === show_move) {
				show_move_was_forced = true;
			}
		}

		// Filter for ab mode...
		// Note that we don't set show_move_was_forced for ab mode.
		// If it wasn't already set, then we have good info for this move.

		if (mode === "ab") {
			if (loss >= config.ab_filter_threshold) {
				ok = false;
			}
		}

		// Go ahead, if the various tests don't filter the move out...

		if (ok || i === 0 || info_list[i].move === show_move) {

			let [x1, y1] = XY(info_list[i].move.slice(0, 2));
			let [x2, y2] = XY(info_list[i].move.slice(2, 4));

			let colour;

			if (show_move_was_forced && info_list[i].move === show_move) {
				if (mode === "untouched") {
					colour = config.best_colour;
				} else {
					colour = config.terrible_colour;
				}
			} else if (info_list[i].__touched === false) {
				colour = config.terrible_colour;
			} else if (info_list[i] === best_info) {
				colour = config.best_colour;
			} else if (loss < config.bad_move_threshold) {
				colour = config.good_colour;
			} else if (loss < config.terrible_move_threshold) {
				colour = config.bad_colour;
			} else {
				colour = config.terrible_colour;
			}

			let x_head_adjustment = 0;				// Adjust head of arrow for castling moves...
			let normal_castling_flag = false;

			if (node.board && node.board.colour(Point(x1, y1)) === node.board.colour(Point(x2, y2))) {

				// So the move is a castling move (reminder: as of 1.1.6 castling format is king-onto-rook).

				if (node.board.normalchess) {
					normal_castling_flag = true;	// ...and we are playing normal Chess (not 960).
				}

				if (x2 > x1) {
					x_head_adjustment = normal_castling_flag ? -1 : -0.5;
				} else {
					x_head_adjustment = normal_castling_flag ? 2 : 0.5;
				}
			}

			arrows.push({
				colour: colour,
				x1: x1,
				y1: y1,
				x2: x2 + x_head_adjustment,
				y2: y2,
				info: info_list[i]
			});

			// If there is no one_click_move set for the target square, then set it
			// and also set an arrowhead to be drawn later.

			if (normal_castling_flag) {
				if (!one_click_moves[x2 + x_head_adjustment][y2]) {
					heads.push({
						colour: colour,
						x2: x2 + x_head_adjustment,
						y2: y2,
						info: info_list[i]
					});
					one_click_moves[x2 + x_head_adjustment][y2] = info_list[i].move;
					if (info_list[i].move === show_move) {
						show_move_head_exists = true;
					}
				}
			} else {
				if (!one_click_moves[x2][y2]) {
					heads.push({
						colour: colour,
						x2: x2 + x_head_adjustment,
						y2: y2,
						info: info_list[i]
					});
					one_click_moves[x2][y2] = info_list[i].move;
					if (info_list[i].move === show_move) {
						show_move_head_exists = true;
					}
				}
			}
		}
	}

	// ------------------------------------------------------------------------------------------------------------

	// It looks best if the longest arrows are drawn underneath. Manhattan distance is good enough.
	// For the sake of displaying the best pawn promotion (of the 4 possible), sort ties are broken
	// by node counts, with lower drawn first. FIXME: what about Stockfish?

	arrows.sort((a, b) => {
		if (Math.abs(a.x2 - a.x1) + Math.abs(a.y2 - a.y1) < Math.abs(b.x2 - b.x1) + Math.abs(b.y2 - b.y1)) {
			return 1;
		}
		if (Math.abs(a.x2 - a.x1) + Math.abs(a.y2 - a.y1) > Math.abs(b.x2 - b.x1) + Math.abs(b.y2 - b.y1)) {
			return -1;
		}
		if (a.info.n < b.info.n) {
			return -1;
		}
		if (a.info.n > b.info.n) {
			return 1;
		}
		return 0;
	});

	boardctx.lineWidth = config.arrow_width;
	boardctx.textAlign = "center";
	boardctx.textBaseline = "middle";
	boardctx.font = config.board_font;

	for (let o of arrows) {

		let cc1 = CanvasCoords(o.x1, o.y1);
		let cc2 = CanvasCoords(o.x2, o.y2);

		if (o.info.move === show_move && config.next_move_outline) {		// Draw the outline at the layer just below the actual arrow.
			boardctx.strokeStyle = "black";
			boardctx.fillStyle = "black";
			boardctx.lineWidth = config.arrow_width + 4;
			boardctx.beginPath();
			boardctx.moveTo(cc1.cx, cc1.cy);
			boardctx.lineTo(cc2.cx, cc2.cy);
			boardctx.stroke();
			boardctx.lineWidth = config.arrow_width;

			if (show_move_head_exists) {			// This is the best layer to draw the head outline.
				boardctx.beginPath();
				boardctx.arc(cc2.cx, cc2.cy, config.arrowhead_radius + 2, 0, 2 * Math.PI);
				boardctx.fill();
			}
		}

		boardctx.strokeStyle = o.colour;
		boardctx.fillStyle = o.colour;
		boardctx.beginPath();
		boardctx.moveTo(cc1.cx, cc1.cy);
		boardctx.lineTo(cc2.cx, cc2.cy);
		boardctx.stroke();
	}

	for (let o of heads) {

		let cc2 = CanvasCoords(o.x2, o.y2);

		boardctx.fillStyle = o.colour;
		boardctx.beginPath();
		boardctx.arc(cc2.cx, cc2.cy, config.arrowhead_radius, 0, 2 * Math.PI);
		boardctx.fill();
		boardctx.fillStyle = "black";

		let s = "?";

		switch (config.arrowhead_type) {
		case 0:
			s = o.info.value_string(0, config.ev_white_pov);
			if (s === "100" && o.info.q < 1.0) {
				s = "99";								// Don't round up to 100.
			}
			break;
		case 1:
			if (node.table.nodes > 0) {
				s = (100 * o.info.n / node.table.nodes).toFixed(0);
			}
			break;
		case 2:
			if (o.info.p > 0) {
				s = o.info.p.toFixed(0);
			}
			break;
		case 3:
			s = o.info.multipv;
			break;
		case 4:
			if (typeof o.info.m === "number") {
				s = o.info.m.toFixed(0);
			}
			break;
		default:
			s = "!";
			break;
		}

		if (o.info.__touched === false) {
			s = "?";
		}

		if (show_move_was_forced && o.info.move === show_move) {
			s = "?";
		}

		boardctx.fillText(s, cc2.cx, cc2.cy + 1);
	}

	draw_arrows_last_mode = mode;		// For debugging only.
};


// For debugging...
let draw_arrows_last_mode = null;
