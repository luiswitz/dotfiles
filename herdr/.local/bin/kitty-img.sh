#!/bin/bash
# Send an image to the terminal via the Kitty graphics protocol.
# Usage: kitty-img.sh <file.png> [cols] [rows]
set -e
FILE=${1:?usage: kitty-img.sh <file> [cols] [rows]}
COLS=${2:-60}
ROWS=${3:-30}
B64=$(base64 -i "$FILE" | tr -d '\n')
LEN=${#B64}
POS=0; FIRST=1
while [ $POS -lt $LEN ]; do
  PART=${B64:$POS:4096}
  POS=$((POS+4096))
  M=1; [ $POS -ge $LEN ] && M=0
  if [ $FIRST -eq 1 ]; then
    printf '\033_Gi=42,q=2,a=T,f=100,c=%d,r=%d,m=%d;%s\033\\' "$COLS" "$ROWS" "$M" "$PART"
    FIRST=0
  else
    printf '\033_Gi=42,q=2,m=%d;%s\033\\' "$M" "$PART"
  fi
done
printf '\n'
