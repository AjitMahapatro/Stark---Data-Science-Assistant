from __future__ import annotations

from dataclasses import dataclass
from threading import Lock
from uuid import uuid4

import pandas as pd


@dataclass
class StoredDataset:
    dataset_id: str
    filename: str
    dataframe: pd.DataFrame


class DatasetStore:
    def __init__(self) -> None:
        self._data: dict[str, StoredDataset] = {}
        self._lock = Lock()

    def put(self, filename: str, dataframe: pd.DataFrame) -> str:
        dataset_id = str(uuid4())
        with self._lock:
            self._data[dataset_id] = StoredDataset(
                dataset_id=dataset_id,
                filename=filename,
                dataframe=dataframe,
            )
        return dataset_id

    def get(self, dataset_id: str) -> StoredDataset | None:
        return self._data.get(dataset_id)


dataset_store = DatasetStore()
