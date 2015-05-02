import os
import sys
import random

MAX_BYTE_VAL = 255
CORRUPTION_TYPES = ["standard", "additive"]


class Corruption:

    def __init__(self, cfilename, ctype, coffset, clength, cperiod):
        self.cfilename = cfilename

        self.ctype = ctype
        if ctype == "standard":
            self.calgorithm = self.corrupt_random
        elif ctype == "additive":
            self.calgorithm = self.corrupt_additive
        else:
        # Default
            self.calgorithm = self.corrupt_random

        self.coffset = coffset
        self.clength = clength
        self.cperiod = cperiod

        self.pos = 0
        self.count = 0

    def params(self):
        return self.cfilename, self.ctype, self.coffset, self.clength, self.cperiod

    def run(self):
        # Determine corrupted file name
        name, ext = os.path.splitext(self.cfilename)
        corrupt_path = name + '_corrupted_' + str(self.count) + ext

        # Create and open original and corrupted files.
        img_orig = open(self.cfilename, "rb")
        img_corrupt = open(corrupt_path, "wb")

        byte = img_orig.read(1)
        self.pos = 0
        edit = False
        while byte:
            # Determine if we should edit this region.
            if self.pos < self.coffset:
                edit = False
            elif self.pos % self.cperiod == 0:
                edit = True
            else:
                if self.pos % self.cperiod > self.clength:
                    edit = False

            # Get byte at pos from the image.
            num = int.from_bytes(byte, sys.byteorder)
            if edit:
                # Call the corresponding corruption function
                corrupt_byte = self.calgorithm(byte)
            else:
                corrupt_byte = num

            # Write to the corrupted file
            img_corrupt.write(bytes([corrupt_byte]))

            # Continue reading image file
            self.pos += 1
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
        corrupt_byte = (num + self.pos % 32) % MAX_BYTE_VAL

        return corrupt_byte
