################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
CPP_SRCS += \
../cameraJaiGo.cpp \
../gui.cpp 

OBJS += \
./cameraJaiGo.o \
./gui.o 

CPP_DEPS += \
./cameraJaiGo.d \
./gui.d 


# Each subdirectory must supply rules for building sources it contributes
%.o: ../%.cpp
	@echo 'Building file: $<'
	@echo 'Invoking: GCC C++ Compiler'
	g++ -I/usr/include/x86_64-linux-gnu -I/usr/local/include/opencv -I/usr/local/include/opencv2 -I/usr/local/include/aravis-0.6 -I/usr/include/glib-2.0 -I/usr/lib/x86_64-linux-gnu/glib-2.0/include -O3 -Wall -c -fmessage-length=0 -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


