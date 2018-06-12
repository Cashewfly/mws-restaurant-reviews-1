#!/bin/sh

for fin in img/*.jpg ; do
	echo "$fin"

	for width in 300 600 ; do
		fout=`echo "$fin" | sed "s/\./_$width./"`

		echo "$fout"

		/usr/bin/convert "$fin" -resize "$width"x "$fout"
	done
done

/usr/bin/identify img/*.jpg
