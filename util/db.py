import os
import sqlite3
import json
import uuid

from typing import Dict, List, Optional, Any, Tuple, cast
from contextlib import contextmanager
import datetime
from pathlib import Path

import logging

import util.game_state_helper as ags
from util.game_state_helper import GameState, Player

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class AvalonDBConfig:
    def __init__(self, env: str = "prod"):
        self.env = env
        self.data_dir = Path("data")
        self.data_dir.mkdir(exist_ok=True)

        if self.env == "test":
            self.db_path = self.data_dir / "avalon_test.db"
        else:
            self.db_path = self.data_dir / "avalon.db"


class AvalonDB:
    def __init__(self, config: AvalonDBConfig = None):
        if config is None:
            config = AvalonDBConfig()
        self.db_path = str(config.db_path)
        self.initialize_database()

    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        # Enable foreign keys
        conn.execute("PRAGMA foreign_keys = ON")
        # Enable returning dictionary-like objects
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def initialize_database(self):
        """Create tables if they don't exist"""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                           CREATE TABLE IF NOT EXISTS players
                           (
                               player_id INTEGER PRIMARY KEY,
                               name      TEXT    NOT NULL,
                               active    INTEGER NOT NULL DEFAULT 1
                           )
                           """)

            cursor.execute("""
                           CREATE TABLE IF NOT EXISTS games
                           (
                               game_id     TEXT PRIMARY KEY,
                               state      TEXT    NOT NULL, -- JSON stored as TEXT
                               start_time TEXT    NOT NULL,
                               active     INTEGER NOT NULL DEFAULT 1
                           )
                           """)

            cursor.execute("""
                           CREATE TABLE IF NOT EXISTS notes
                           (
                               note_id    TEXT PRIMARY KEY,
                               game_id    TEXT NOT NULL,
                               timestamp TEXT NOT NULL,
                               content   TEXT NOT NULL,
                               FOREIGN KEY (game_id) REFERENCES games (game_id) ON DELETE CASCADE
                           )
                           """)

            conn.commit()

    def new_game(self) -> Tuple[bool, Optional[str]]:
        """Create a new game and return its ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            game_id = str(uuid.uuid4())
            state = ags.new_state()
            start_time = datetime.datetime.now().isoformat()
            cursor.execute("INSERT INTO games (game_id, state, start_time, active) VALUES (?, ?, ?, 1)",
                           (game_id, json.dumps(state), start_time))
            conn.commit()
        return True, game_id

    def get_games(self) -> Tuple[bool, Optional[List[Dict[str, Any]]]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM games")
            games = cursor.fetchall()
            logger.debug(f"Games: {games}")
            return True, games

    def get_all_players(self) -> Tuple[bool, Optional[List[Player]]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM players")
            players = cursor.fetchall()
            logger.debug(f"All players: {players}")
            return True, players

    def get_next_player_id(self) -> Tuple[bool, Optional[int]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT MAX(player_id) FROM players")
            row = cursor.fetchone()
            max_id = row[0] if row else None
            if max_id is not None:
                return True, max_id + 1
            else:
                return True, 0

    # DB to AGS
    def get_game_state(self, game_id: str) -> Tuple[bool, Optional[GameState]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT state FROM games WHERE game_id = ?", (game_id,))
            row = cursor.fetchone()
            if row:
                state = cast(GameState, json.loads(row['state']))
                return True, state
            else:
                return False, None

    def add_player(self, player_name) -> Tuple[bool, Optional[int]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            _, player_id = self.get_next_player_id()
            cursor.execute("INSERT INTO players (name, player_id, active) VALUES (?, ?,  1)", (player_name, player_id))
            conn.commit()
            return True, player_id

    # Game aware
    def game_exists(self, game_id: str) -> Tuple[bool, Optional[bool]]:
        """Check if a game exists"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT game_id FROM games WHERE game_id = ?", (game_id,))
            row = cursor.fetchone()
            return True, row is not None

    def game_is_active(self, game_id: str) -> Tuple[bool, Optional[bool]]:
        """Check if a game is active"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT active FROM games WHERE game_id = ?", (game_id,))
            row = cursor.fetchone()
            logger.debug(f"Game {game_id} is active: {row['active']}")
            if row:
                return True, row["active"] == 1
            else:
                return False, None

    def get_game_players_with_name(self, game_id: str) -> Tuple[bool, Optional[List[ags.Player]]]:
        """Get all players in a game"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT state FROM games WHERE game_id = ?", (game_id,))
            row = cursor.fetchone()
            if row:
                state = json.loads(row['state'])
                # state = cast(GameState, state_dict)
                player_ids = [player.get('player_id') for player in state.get('players', [])]
                return self.get_db_players_from_id_list(player_ids)
            else:
                return False, None

    def get_db_players_from_id_list(self, player_ids: List[int]) -> Tuple[bool, Optional[List[Player]]]:
        if not player_ids:
            return True, []
        with self.get_connection() as conn:
            cursor = conn.cursor()
            placeholders = ','.join('?' for _ in player_ids)
            cursor.execute(f"SELECT * FROM players WHERE player_id IN ({placeholders})", player_ids)
            players = cursor.fetchall()
            return True, players

    def get_valid_players(self, game_id: str) -> Tuple[bool, Optional[List[Player]]]:
        """Get players that can join a game"""
        _, all_players = self.get_all_players()
        _, game_players = self.get_game_players_with_name(game_id)
        logger.debug(f"All players: {all_players}")
        logger.debug(f"Game players: {game_players}")
        if all_players is None or game_players is None:
            return False, None
        game_player_ids: List[int] = [player['player_id'] for player in game_players]
        valid_players = [player for player in all_players if player['player_id'] not in game_player_ids]
        return True, valid_players

    def add_player_to_game(self, game_id, player_id) -> Tuple[bool, Optional[str]]:
        status, state = self.get_game_state(game_id)
        if not status:
            return False, 'Failed to get game state'
        state = ags.add_player(state, player_id)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE games SET state = ? WHERE game_id = ?", (json.dumps(state), game_id))
            conn.commit()
        return True, None

    def remove_player_from_game(self, game_id: str, player_id) -> Tuple[bool, Optional[str]]:
        status, state = self.get_game_state(game_id)
        if not status:
            return False, 'Failed to get game state'
        state = ags.remove_player(state, player_id)
        logger.debug(f"Removed player {player_id} from game state {state}")
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE games SET state = ? WHERE game_id = ?", (json.dumps(state), game_id))
            conn.commit()
        return True, None
