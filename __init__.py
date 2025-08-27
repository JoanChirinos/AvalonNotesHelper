from flask import (
    Flask
)
from avalon import avalon

import json
import logging

logging.basicConfig(level=logging.DEBUG)
app = Flask(__name__)
app.register_blueprint(avalon, url_prefix="/avalon")

app.secret_key = "legumes"

@app.route("/")
def hello():
    return "<a href='/avalon'>Avalon</a>"


if __name__ == "__main__":
    app.run(debug=True)