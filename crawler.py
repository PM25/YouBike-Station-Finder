#%%
import json
from pathlib import Path
from datetime import datetime


def save(data, folder="data"):
    Path(folder).mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    fname = f'{now.strftime("%Y-%m-%d_%H-%M-%S")}.json'
    fpath = Path(folder) / Path(fname)
    with open(fpath, "w", encoding="utf") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)


#%%
import requests

url = r"https://tcgbusfs.blob.core.windows.net/blobyoubike/YouBikeTP.json"


#%%
from time import sleep

for _ in range(15):
    resp = requests.get(url, verify=False)
    data = resp.json()
    if data["retCode"] == 1:
        data = data["retVal"]
        save(data)
    sleep(60)

# %%
