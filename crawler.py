#%%
import json
from datetime import datetime
from pathlib import Path
from time import sleep

import requests


def save(data, folder="data"):
    Path(folder).mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    fname = f'{now.strftime("%Y-%m-%d_%H-%M-%S")}.json'
    fpath = Path(folder) / Path(fname)
    with open(fpath, "w", encoding="utf") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)


url = r"https://tcgbusfs.blob.core.windows.net/blobyoubike/YouBikeTP.json"
total_time = 15  # Minutes

# Start from here!
if __name__ == "__main__":
    for _ in range(total_time):
        resp = requests.get(url, verify=False)
        data = resp.json()
        if data["retCode"] == 1:
            data = data["retVal"]
            save(data)
        sleep(60)
