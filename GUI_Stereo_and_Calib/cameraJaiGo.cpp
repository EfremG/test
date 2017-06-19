/*
 * cameraJaiGo.cpp
 *
 *  Created on: 14.02.2017
 *      Author: efrem
 */

#include "cameraJaiGo.h"

const char	*szBufferStatusFromInt[] = {
	"ARV_BUFFER_STATUS_SUCCESS",
	"ARV_BUFFER_STATUS_CLEARED",
	"ARV_BUFFER_STATUS_TIMEOUT",
	"ARV_BUFFER_STATUS_MISSING_PACKETS",
	"ARV_BUFFER_STATUS_WRONG_PACKET_ID",
	"ARV_BUFFER_STATUS_SIZE_MISMATCH",
	"ARV_BUFFER_STATUS_FILLING",
	"ARV_BUFFER_STATUS_ABORTED"
};


void cameraJaiGo::new_buffer_cb(ArvStream* str,void *data){
	cameraJaiGo* testing = (cameraJaiGo*) data;
    ArvBuffer *buffer;

    if(str!=NULL)
    	buffer = arv_stream_try_pop_buffer (str);

    if (buffer != NULL) {
        if (arv_buffer_get_status (buffer) == ARV_BUFFER_STATUS_SUCCESS){
        	size_t bufferSize;
        	void* bufferDataPtr = (void*) arv_buffer_get_data(buffer, &bufferSize);
        	arv_buffer_get_image_region(buffer,&(testing->offsetX), &(testing->offsetY), &(testing->width), &(testing->height));

        	if(bufferDataPtr!= NULL){
				testing->image= cv::Mat(testing->height,testing->width,CV_8UC1,(uchar*)bufferDataPtr,testing->width);
				testing->newFrameFromCb = true;
        	}
        }else{
        	printf("Frame error: %s", szBufferStatusFromInt[arv_buffer_get_status (buffer)]);
        	printf("   %s\n",arv_camera_get_device_id(testing->camera));
        }

        arv_stream_push_buffer (str, buffer);
    }
}






cameraJaiGo::cameraJaiGo(ArvCamera* cameraPtr,cv::String nam) {
	maxCalibImages=10;
	exposureTime=5;
	redGain=5;
	greenGain=5;
	blueGain=5;
	camera=cameraPtr;
	device=arv_camera_get_device(cameraPtr);
	counterImages=0;
	name =nam;

	cameraMatrix = (cv::Mat_<double>(3,3) << 1200, 0, 1280, 0, 1200, 1024, 0, 0, 1);

	patternSize=cv::Size(9,6);
	objectPoints.clear();

	std::vector<cv::Point3f> knownBoardPositions;
	int cornerSpacingM = 25; //Spacing of corners in mm
	for(int i = 0; i < patternSize.height; ++i){
		for(int j = 0; j < patternSize.width; ++j){
			knownBoardPositions.push_back(cv::Point3f(j*cornerSpacingM, i*cornerSpacingM, 0));
		}
	}
	objectPoints.push_back(knownBoardPositions);
	flagCalibrationFinished=false;

	newFrameFromCb=false;

}

cameraJaiGo::~cameraJaiGo() {
	// TODO Auto-generated destructor stub
}



void cameraJaiGo::loop(){
	if(!image.empty()){
		if(newFrameFromCb) {
			bayerFrame = image;//cv::cvarrToMat(image);

		}
	}
}

void cameraJaiGo::config_camera(){
	gint payload=arv_camera_get_payload(camera);


	arv_camera_set_acquisition_mode(camera, ARV_ACQUISITION_MODE_CONTINUOUS);

	arv_device_set_string_feature_value(device, "TriggerMode", "Off");
	arv_device_set_string_feature_value(device, "AcquisitionMode","Continuous");
	arv_device_set_string_feature_value(device, "ExposureMode", "Off");
	arv_device_set_string_feature_value(device, "ExposureAuto", "Continuous");


	arv_camera_gv_set_packet_size(camera, 9000);
	stream=arv_camera_create_stream(camera,NULL,NULL);
	int		socketBufferMode = ARV_GV_STREAM_SOCKET_BUFFER_AUTO;
	int		packetResendMode = ARV_GV_STREAM_PACKET_RESEND_ALWAYS;
	int		packetTimeout =   8000;
	int		frameRetention = 12000;



	if(stream!=NULL){

		g_signal_connect(stream, "new-buffer", G_CALLBACK(new_buffer_cb), this);
		arv_stream_set_emit_signals (stream, TRUE);

		g_object_set(stream,"socket-buffer", socketBufferMode,"socket-buffer-size", 0, NULL);
		g_object_set(stream,"packet-resend", packetResendMode, NULL);
		g_object_set(stream,"packet-timeout", (unsigned) packetTimeout,"frame-retention", (unsigned) frameRetention, NULL);

		for(int i =0;i<10;i++)
			arv_stream_push_buffer(stream,arv_buffer_new(payload,NULL));

		printf("Initilaization ok \n");

	}
}

void cameraJaiGo::buttonAutoExposure(int stat,void *data){
	cameraJaiGo* testing = (cameraJaiGo*) data;
	if(stat && testing->device!=NULL){
		arv_device_set_string_feature_value(testing->device, "ExposureMode", "Off");
		arv_device_set_string_feature_value(testing->device, "ExposureAuto", "Continuous");
	}
	else if(!stat && testing->device!=NULL){
		arv_device_set_string_feature_value(testing->device, "ExposureMode", "Timed");
		arv_device_set_string_feature_value(testing->device, "ExposureAuto", "Off");

	}
}
void cameraJaiGo::trackbarExposureTime(int pos, void* data){
	cameraJaiGo* testing = (cameraJaiGo*) data;
	if(pos>0)
	arv_device_set_float_feature_value(testing->device, "ExposureTime",  pos);
}
void cameraJaiGo::buttonAutoWhiteBalance(int stat,void *data){
}
void cameraJaiGo::buttonTakePicture(int stat,void *data){
	stereoCam *stereo = (stereoCam *) data;
	arv_camera_stop_acquisition(stereo->camera1);
	arv_camera_stop_acquisition(stereo->camera2);

}
void cameraJaiGo::buttonRunStream(int stat,void *data){
	stereoCam *stereo = (stereoCam *) data;
	arv_camera_start_acquisition(stereo->camera2);
	arv_camera_start_acquisition(stereo->camera1);
}
void cameraJaiGo::buttonSavePicture(int stat,void *data){
	cameraJaiGo* testing = (cameraJaiGo*) data;
	testing->counterImages++;
	std::ostringstream tmp;
	tmp << "/Picture_" <<testing->name<<"__" << testing->counterImages << ".png";
	cv::String path=tmp.str();
	cv::imwrite(path,testing->rgb);


}
void cameraJaiGo::buttonCalibrateCamera(int stat,void *data){
	cameraJaiGo* testing = (cameraJaiGo*) data;
	arv_camera_stop_acquisition(testing->camera);
	testing->camera_calibrate();
	arv_camera_start_acquisition(testing->camera);

}
void cameraJaiGo::buttonTriggerActivation(int stat,void *data){
	stereoCam *stereo = (stereoCam *) data;
	arv_camera_stop_acquisition(stereo->camera1);
	arv_camera_stop_acquisition(stereo->camera2);
	ArvDevice *device1=arv_camera_get_device(stereo->camera1);
	ArvDevice *device2=arv_camera_get_device(stereo->camera2);
	if(stat){
		arv_device_set_string_feature_value(device1, "TriggerMode", "On");
		arv_device_set_string_feature_value(device1,"TriggerSource","Software");
		arv_device_set_string_feature_value(device1, "ExposureMode", "Timed");
		arv_device_set_string_feature_value(device1, "ExposureAuto", "Off");
		arv_device_set_float_feature_value(device1, "ExposureTime", 40000);
		arv_device_set_string_feature_value(device1, "TriggerSelector","AcquisitionStart");
		arv_device_set_string_feature_value(device1, "AcquisitionMode","SingleFrame");
		arv_device_set_string_feature_value(device1, "TriggerDelay","1");

		arv_device_set_string_feature_value(device2, "TriggerMode", "On");
		arv_device_set_string_feature_value(device2,"TriggerSource","Software");
		arv_device_set_string_feature_value(device2, "ExposureMode", "Timed");
		arv_device_set_string_feature_value(device2, "ExposureAuto", "Off");
		arv_device_set_float_feature_value(device2, "ExposureTime", 40000);//stereo->exposure_time_2[0]);
		arv_device_set_string_feature_value(device2, "TriggerSelector","AcquisitionStart");
		arv_device_set_string_feature_value(device2, "AcquisitionMode","SingleFrame");
		arv_device_set_string_feature_value(device2, "TriggerDelay","1");
	}else{
		arv_device_set_string_feature_value(device1, "TriggerMode", "Off");
		arv_device_set_string_feature_value(device1, "AcquisitionMode","Continuous");
		arv_device_set_string_feature_value(device1, "ExposureMode", "Off");
		arv_device_set_string_feature_value(device1, "ExposureAuto", "Continuous");

		arv_device_set_string_feature_value(device2, "TriggerMode", "Off");
		arv_device_set_string_feature_value(device2, "AcquisitionMode","Continuous");
		arv_device_set_string_feature_value(device2, "ExposureMode", "Off");
		arv_device_set_string_feature_value(device2, "ExposureAuto", "Continuous");
	}

	arv_camera_start_acquisition(stereo->camera1);
	arv_camera_start_acquisition(stereo->camera2);





}
void cameraJaiGo::buttonSoftwareTrigger(int stat,void *data){
	stereoCam *stereo = (stereoCam *) data;
	arv_camera_start_acquisition(stereo->camera1);
	arv_camera_start_acquisition(stereo->camera2);
	arv_camera_software_trigger(stereo->camera1);
	arv_camera_software_trigger(stereo->camera2);

}
void cameraJaiGo::buttonBinning(int stat,void *data){
	cameraJaiGo* testing = (cameraJaiGo*) data;
	arv_camera_stop_acquisition(testing->camera);
	arv_device_set_string_feature_value(testing->device, "BinningSelector", "Sensor");
	arv_device_set_string_feature_value(testing->device, "DecimationHorizontalMode", "Discard");
	//arv_device_set_integer_feature_value(testing->device, "DecimationHorizontal", 2);
	arv_device_set_string_feature_value(testing->device, "DecimationVerticalMode", "Discard");
	//arv_device_set_integer_feature_value(testing->device, "DecimationVertical", 2);
	arv_camera_start_acquisition(testing->camera);
}
void cameraJaiGo::buttonShowRectication(int stat,void *data){
	cameraJaiGo* testing = (cameraJaiGo*) data;
	arv_camera_stop_acquisition(testing->camera);
	cv::namedWindow("raw2",cv::WINDOW_NORMAL);
	cv::namedWindow("remapped",cv::WINDOW_NORMAL);
	cv::namedWindow("undistort",cv::WINDOW_NORMAL);
	if(!testing->bayerFrame.empty()){
		cv::cvtColor(testing->bayerFrame,testing->rgb,cv::COLOR_BayerGB2GRAY);
		cv::Mat remap,undist;
		cv::remap(testing->rgb, remap, testing->map1, testing->map2, cv::INTER_LINEAR);
		cv::undistort(testing->rgb, undist, testing->cameraMatrix, testing->distCoeffs);
		cv::imshow(testing->name,testing->rgb);
		cv::imshow("remapped "+testing->name,remap);
		cv::imshow("undistort "+testing->name,undist);
		if(cv::waitKey(0)==32){}
		cv::waitKey(500);

	}
	arv_camera_start_acquisition(testing->camera);
}
/*void cameraJaiGo::create_window(cv::String str,stereoCam *stereo){
}*/
void cameraJaiGo::create_window(cv::String str){

	cv::namedWindow(name,cv::WINDOW_NORMAL);
	cv::createButton("Save Pictures " + name,cameraJaiGo::buttonSavePicture,this,CV_PUSH_BUTTON,0);
	cv::createButton("Calibrate " + name,cameraJaiGo::buttonCalibrateCamera,this,CV_PUSH_BUTTON,0);
	cv::createButton("Auto Exposure "+name,cameraJaiGo::buttonAutoExposure,this,CV_CHECKBOX,1);
	cv::createTrackbar("Exposure Time "+name,"", &exposureTime, 50000,cameraJaiGo::trackbarExposureTime ,this);
	//cv::createButton("Auto White Balance "+name,cameraJaiGo::buttonAutoWhiteBalance,this,CV_CHECKBOX,0);
	//cv::createTrackbar("Red Gain "+name,"", &redGain, 255, NULL);
	//cv::createTrackbar("Blue Gain "+name,"", &blueGain, 255, NULL);
	//cv::createTrackbar("Green Gain "+name,"", &greenGain, 255, NULL);
	//cv::createButton("Binning",cameraJaiGo::buttonBinning,this,CV_PUSH_BUTTON,0);

}


void cameraJaiGo::camera_calibrate(){
	if(!bayerFrame.empty()){

		cv::cvtColor(bayerFrame,rgb,cv::COLOR_BayerGB2GRAY);
		bool found = cv::findChessboardCorners(rgb, patternSize, corners, cv::CALIB_CB_ADAPTIVE_THRESH | cv::CALIB_CB_NORMALIZE_IMAGE | cv::CALIB_CB_FAST_CHECK);

		if (found){
			cv::cornerSubPix(rgb, corners, cv::Size(11,11), cv::Size(-1,-1), cv::TermCriteria(cv::TermCriteria::EPS+cv::TermCriteria::COUNT, 30, 0.1));
			imagePoints.push_back(corners);

			objectPoints.resize(imagePoints.size(),objectPoints[0]);
			cv::Mat tmp1,tmp2,tmp3;


			calibrationError = cv::calibrateCamera(objectPoints, imagePoints, rgb.size(), cameraMatrix, distCoeffs, rvecs, tvecs,tmp1,tmp2,tmp3,cv::CALIB_USE_INTRINSIC_GUESS);

			std::stringstream ss;
			ss << std::fixed << std::setprecision(2) << calibrationError;


			cv::cvtColor(rgb,rgb,cv::COLOR_GRAY2BGR);
			cv::drawChessboardCorners(rgb,patternSize,corners,found);
			cv::QtFont font = cv::fontQt("Text",80,cv::Scalar(0,255,0),cv::QT_FONT_NORMAL);
			cv::addText( rgb, "Good image for calibration", cv::Point(500,200), font);
			cv::addText( rgb, ss.str(), cv::Point(500,100), font);

		}else{
			cv::cvtColor(rgb,rgb,cv::COLOR_GRAY2BGR);
			cv::QtFont font = cv::fontQt("Text",80,cv::Scalar(0,0,255),cv::QT_FONT_NORMAL);
			cv::addText( rgb, "Bad image for calibration", cv::Point(500,200), font);
		}


		if(imagePoints.size()>=maxCalibImages){
			cv::QtFont font = cv::fontQt("Text",100,cv::Scalar(0,255,0),cv::QT_FONT_NORMAL);
			cv::addText( rgb, "Calibration finished", cv::Point(400,900), font);

			cv::Mat cameraMatrixTmp = cv::getOptimalNewCameraMatrix(cameraMatrix, distCoeffs, rgb.size(), 1, rgb.size());
			cv::initUndistortRectifyMap(cameraMatrix, distCoeffs, cv::Mat(), cameraMatrixTmp, rgb.size(), CV_16SC2, map1, map2);

			std::string outputFile = "/cameraCalibrationData_"+name+"_.xml";
			cv::FileStorage fs(outputFile, cv::FileStorage::WRITE);

			fs << "camera_name" << name;
			fs << "camera_matrix" << cameraMatrix;
			fs << "distortion_coefficients" << distCoeffs;
			fs << "rotation_vectors" << rvecs;
			fs << "translation_vectors" << tvecs;
			fs << "map_1" << map1;
			fs << "map_2" << map2;

			flagCalibrationFinished=true;
		}

		cv::imshow(name,rgb);
		flag_test=true;

		rgb.release();
	}

}






