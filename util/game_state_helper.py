import logging
from typing import List, Optional
from typing_extensions import TypedDict
from copy import deepcopy

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class Player(TypedDict):
    player_id: int
    role: str


class Round(TypedDict):
    team: List[int]
    approvals: List[int]
    fails: int
    king: int


class Quest(TypedDict):
    rounds: List[Round]


class GameState(TypedDict):
    players: List[Player]
    quests: List[Quest]
    roles: List[str]

def new_state():
    state: GameState = {
        "players": [],
        "quests": [],
        "roles": []
    }
    logger.debug("Created new game state")
    return state

def add_player(game_state: GameState, player_id: int):
    state = deepcopy(game_state)
    player: Player = {
        "player_id": player_id,
        "role": ''
    }
    state["players"].append(player)
    logger.debug(f"Added player {player_id}to game state")
    return state

def remove_player(game_state: GameState, player_id):
    state = deepcopy(game_state)
    state['players'] = [player for player in state['players'] if player['player_id'] != int(player_id)]
    logger.debug(f"Removed player {player_id} from game state {state}")
    return state