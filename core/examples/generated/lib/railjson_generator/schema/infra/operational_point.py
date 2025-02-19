from dataclasses import dataclass
from typing import List

import infra


@dataclass
class OperationalPoint:
    label: str
    trigram: str
    parts: List

    def __init__(self, label: str, trigram: str = None):
        self.label = label
        self.trigram = trigram or label[:3].upper()
        self.parts = list()

    def add_part(self, track, offset):
        op_part = OperationalPointPart(self, offset)
        track.operational_points.append(op_part)
        self.parts.append(op_part)


@dataclass
class OperationalPointPart:
    operarational_point: OperationalPoint
    position: float

    def to_rjs(self, track):
        return infra.OperationalPointPart(
            track=track.make_rjs_ref(),
            position=self.position,
        )
