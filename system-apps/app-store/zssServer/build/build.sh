#!/bin/sh
# © 2022-2024 Rocket Software, Inc. or its affiliates. All Rights Reserved.
# ROCKET SOFTWARE, INC. CONFIDENTIAL

mkdir tmp 2>/dev/null
cd tmp

if [ -z "$ZSS_DIR" ]
then
    echo "Set ZSS_DIR env var to build"
    exit 1
fi


ZOWECOMMON=${ZSS_DIR}/deps/zowe-common-c

mkdir ../../../lib 2>/dev/null

xlc \
  -D_OPEN_THREADS \
  -D_XOPEN_SOURCE=600 \
  -DAPF_AUTHORIZED=0 \
  -DNOIBMHTTP \
  "-Wa,goff" "-Wc,langlvl(EXTC99),float(HEX),agg,expo,list(),so(),search(),\
       goff,xref,gonum,roconst,gonum,asm,asmlib('SYS1.MACLIB'),asmlib('CEE.SCEEMAC'),dll" -Wl,dll \
  -I ${ZSS_DIR}/h -I ${ZOWECOMMON}/h \
  -I ${ZOWECOMMON}/platform/posix \
  -o ../../../lib/appStoreDataService.so \
  ../../c/appStoreDataService.c \
  ../pluginAPI.x \

echo "Compile finished with rc=$?"

extattr +p ../../../lib/appStoreDataService.so


