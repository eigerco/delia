#!/bin/bash

# generate-test-file.sh

# Create a 1KB file filled with "test data "
TEST_DATA=$(printf 'test data %.0s' {1..102})  # 102 * 10 chars = 1020 bytes
echo -n "$TEST_DATA" > test-file-1024.txt

echo "Test file created: test-file-1024.txt"
echo "File size: $(wc -c < test-file-1024.txt) bytes"
