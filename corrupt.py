import os
import sys
import random
from enum import Enum

MAX_BYTE_VAL = 255

CORRUPTION_TYPES = ["standard", "additive"]


class Corruption:
    count = 0
    pos = 0

    def __init__(self, cfilename, ctype, coffset, clength, cperiod):
        self.cfilename = cfilename

        print(ctype)

        if ctype == "standard":
            self.ctype = self.corrupt_random
        elif ctype == "additive":
            self.ctype = self.corrupt_additive
        else:
        # Default
            self.ctype = self.corrupt_random

        self.coffset = coffset
        self.clength = clength
        self.cperiod = cperiod

        print(self.ctype)

    def run(self):
        # Determine corrupted file name
        name, ext = os.path.splitext(self.cfilename)
        corrupt_path = name + '_corrupted_' + str(self.count) + ext

        # Create and open original and corrupted files.
        img_orig = open(self.cfilename, "rb")
        img_corrupt = open(corrupt_path, "wb")

        byte = img_orig.read(1)
        pos = 0
        edit = False
        while byte:
            # Determine if we should edit this region.
            if pos < self.coffset:
                edit = False
            elif pos % self.cperiod == 0:
                edit = True
            else:
                if pos % self.cperiod > self.clength:
                    edit = False

            # Get byte at pos from the image.
            num = int.from_bytes(byte, sys.byteorder)
            if edit:
                # Slightly change the value of the byte by a random amount
                corrupt_byte = self.ctype(byte)
                # corrupt_byte = max(32, (num + random.randint(-3, 3)) % MAX_BYTE_VAL)
            else:
                corrupt_byte = num

            # Write to the corrupted file
            img_corrupt.write(bytes([corrupt_byte]))

            # Continue reading image file
            pos += 1
            byte = img_orig.read(1)

        self.count += 1
        return corrupt_path

    def corrupt_random(self, byte):
        num = int.from_bytes(byte, sys.byteorder)

        # Slightly change the value of the byte by a random amount
        corrupt_byte = max(32, (num + random.randint(-3, 3)) % MAX_BYTE_VAL)

        return corrupt_byte

    def corrupt_additive(self, byte):
        num = int.from_bytes(byte, sys.byteorder)

        # Add to the value of the byte (modulus maximum byte value) according to the length.
        corrupt_byte = num + pos if (num + self.pos) < MAX_BYTE_VAL else MAX_BYTE_VAL

        return corrupt_byte

