#!/bin/sh

rm img/*00.jpg

for fin in img/?.jpg img/??.jpg ; do
	echo "$fin"

	for width in 400 600 ; do
		fout=`echo "$fin" | sed "s/\./_$width./"`

		echo "$fout"

		/usr/bin/convert "$fin" -resize "$width"x "$fout"
	done
done

/usr/bin/identify img/*.jpg
