import os
import sys
import random

MAX_BYTE_VAL = 255


class Corruption:
    count = 0

    def __init__(self, cfilename, ctype, coffset, clength, cperiod):
        self.cfilename = cfilename
        self.ctype = ctype
        self.coffset = coffset
        self.clength = clength
        self.cperiod = cperiod

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
                corrupt_byte = max(32, (num + random.randint(-3, 3)) % MAX_BYTE_VAL)
            else:
                corrupt_byte = num

            # 1% chance to skip the byte
            if pos < self.coffset or random.random() > 0.0:
                # Write to the corrupted file
                img_corrupt.write(bytes([corrupt_byte]))

            # Continue reading image file
            pos += 1
            byte = img_orig.read(1)

        self.count += 1
        return corrupt_path
