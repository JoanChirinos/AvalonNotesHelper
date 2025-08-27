import json
import logging
from datetime import datetime

from flask import (
    Blueprint, render_template, redirect, flash, request, Response
)
from util.db import AvalonDB

avalon = Blueprint('avalon', __name__)
db = AvalonDB()
# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


@avalon.route("/")
def hello():
    return render_template('avalon/landing.html')

@avalon.route("/new_game")
def new_game():
    success, game_id = db.new_game()
    if not success:
        flash('Could not create new game.', 'danger')
        return redirect('/avalon', 500)
    return redirect(f'game/{game_id}')

@avalon.route("/game/<game_id>")
def game(game_id):
    status, exists = db.game_exists(game_id)
    if not exists:
        flash(f'Game {game_id} does not exist.', 'danger')
        return redirect('/avalon', 404)
    status, active = db.game_is_active(game_id)
    logger.debug(f"Game {game_id} is active: {active}")
    if not status:
        flash('Could not get game status.', 'danger')
        return redirect('/avalon', 500)
    if not active:
        return "WIP"
    else:
        kwargs = {
            'game_id': game_id
        }
        return render_template('avalon/game_setup.html', **kwargs)

@avalon.route("/game/<game_id>/add_player", methods=['POST'])
def add_player(game_id):
    player_name = request.form.get('player_name', None)
    player_id = request.form.get('player_id', None)
    if player_id is None and player_name is None:
        flash('Player name or ID must be provided.', 'danger')
        return redirect(f'/avalon/game/{game_id}', 400)
    elif player_id and player_name is None:
        success, msg = db.add_player_to_game(game_id, int(player_id))
        if not success:
            flash(msg, 'danger')
            return redirect(f'/avalon/game/{game_id}', 400)
        else:
            return redirect(f'/avalon/game/{game_id}/players/game_setup_players_in_game')
    elif player_id is None and player_name and player_name.strip() == '':
        flash('Player name cannot be empty.', 'danger')
        return redirect(f'/avalon/game/{game_id}', 400)
    elif player_id is None and player_name:
        _, player_id = db.add_player(player_name)
        db.add_player_to_game(game_id, player_id)
        return redirect(f'/avalon/game/{game_id}/players/game_setup_players_in_game')
    else:
        flash('Invalid player name or ID.', 'danger')
        return redirect(f'/avalon/game/{game_id}', 400)

@avalon.route("/game/<game_id>/remove_player/<player_id>", methods=['GET'])
def remove_player_from_game(game_id, player_id):
    success, msg = db.remove_player_from_game(game_id, player_id)
    if not success:
        logger.error(msg)
    return game_setup_players_in_game(game_id)

# Snippet render
@avalon.route("/landing/games")
def landing_games():
    success, games_rows = db.get_games()
    games = []
    for games_row in games_rows:
        game = {
            'game_id': games_row['game_id'],
            'start_time': datetime.fromisoformat(games_row['start_time']).strftime("%B %-d, %Y at %-I:%M %p"),
            'player_count': len(json.loads(games_row['state'])['players'])
        }
        games.append(game)
    kwargs = {
        'games': games
    }
    print(games)
    return render_template('avalon/snippets/landing_games.html', **kwargs)

@avalon.route("/landing/game/<game_id>/players")
def landing_game_players(game_id):
    success, players = db.get_game_players_with_name(game_id)
    player_names = [player['name'] for player in players]
    kwargs = {
        'player_names': player_names
    }
    return render_template('avalon/snippets/landing_games_players.html', **kwargs)

@avalon.route("/game/<game_id>/valid_players")
def valid_players(game_id):
    status, valid_players = db.get_valid_players(game_id)
    logger.debug(f"status: {status}; Valid players: {valid_players}")
    kwargs = {
        'game_id': game_id,
        'players': valid_players
    }
    return render_template('avalon/snippets/game_setup_valid_players.html', **kwargs)

@avalon.route("/game/<game_id>/players/game_setup_players_in_game")
def game_setup_players_in_game(game_id):
    status, players_in_game = db.get_game_players_with_name(game_id)
    logger.debug(f"status: {status}; Players in game: {players_in_game}")
    kwargs = {
        'game_id': game_id,
        'players': players_in_game
    }
    return render_template('avalon/snippets/game_setup_players_in_game.html', **kwargs)