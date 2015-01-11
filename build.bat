@echo off

REM ###################################################
REM #
REM #   The buildtools repository is at:
REM #   https://github.com/foo123/scripts/buildtools
REM #
REM ###################################################

REM to use the python build tool do:
REM python ..\Beeld\Beeld.py --config ".\config.custom"

REM to use the php build tool do:
REM php -f ..\Beeld\Beeld.php -- --config=".\config.custom"

REM to use the node build tool do:
node ..\Beeld\Beeld.js --config ".\config.custom"
