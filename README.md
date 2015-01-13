# Crunge
A small Python utility to corrupt images in interesting ways.

## Overview
Crunge works by randomly altering bytes of an image. It corrupts images according to the following parameters:
* <code>offset</code> - number of bytes before the first corrupted byte
* <code>period</code> - number of bytes between each corrupted region of the image
* <code>length</code> - crunge will alter <code>length</code> bytes every <code>period</code>
