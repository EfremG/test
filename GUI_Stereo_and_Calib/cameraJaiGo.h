/*
 * cameraJaiGo.h
 *
 *  Created on: 14.02.2017
 *      Author: efrem
 */

#ifndef CAMERAJAIGO_H_
#define CAMERAJAIGO_H_

#include <opencv2/opencv.hpp>
#include <opencv2/highgui.hpp>
#include <opencv/cv.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/core.hpp>
#include <opencv2/calib3d.hpp>

#include <aravis-0.6/arv.h>
#include <glib-2.0/glib.h>
#include <time.h>
#include <string>

#include <stdlib.h>
#include <stdio.h>
#include <time.h>
#include <unistd.h>

struct stereoCam{
	ArvCamera* camera1;
	ArvCamera* camera2;
	cv::Mat cam1_image;
	cv::Mat cam2_image;

	bool stereo_calibration_finished;
	bool reconstruct_3d;
	cv::Mat map11, map12, map21, map22;

	int blocksize;
	int num_dispa;

	bool show_histogram;
	int num_x,num_y,num_d;
	int *exposure_time_1,*exposure_time_2;
};

class cameraJaiGo {
private:

	int redGain;
	int greenGain;
	int blueGain;
public:
	int exposureTime;
	ArvCamera* camera;
	ArvStream* stream;
	ArvDevice* device;
	cv::Mat bayerFrame,rgb;

	int maxCalibImages;

	int counterImages;
	bool flag_test;
	void loop();

	size_t bufferSize;
	cameraJaiGo(ArvCamera* cameraPtr, cv::String nam);
	~cameraJaiGo();
	//void create_window(cv::String str,stereoCam *stereo);
	void create_window(cv::String str);
	void config_camera();

	void camera_calibrate();
	std::vector<cv::Point2f> corners;
	std::vector<std::vector<cv::Point2f> > imagePoints;
	std::vector<std::vector<cv::Point3f> > objectPoints;
	double calibrationError;
	std::vector<cv::Mat> rvecs, tvecs;
	cv::Mat map1, map2;
	cv ::Mat cameraMatrix = cv::Mat::eye(3, 3, CV_64F);
	cv::Mat distCoeffs = cv::Mat::zeros(8, 1, CV_64F);
	bool flagCalibrationFinished;
	cv::Size patternSize;

	cv::String name;

	int offsetX, offsetY, width, height;
	bool newFrameFromCb;
	cv::Mat image;

	static void new_buffer_cb(ArvStream* str,void* data);




	static void buttonAutoExposure(int stat,void *data);
	static void buttonAutoWhiteBalance(int stat,void *data);
	static void buttonShowRectication(int stat,void *data);
	static void buttonTakePicture(int stat,void *data);
	static void buttonRunStream(int stat,void *data);
	static void buttonSavePicture(int stat,void *data);
	static void buttonCalibrateCamera(int stat,void *data);
	static void buttonWhiteBalance(int stat,void *data);
	static void buttonTriggerActivation(int stat,void *data);
	static void buttonSoftwareTrigger(int stat,void *data);
	static void buttonBinning(int stat,void *data);

	static void trackbarExposureTime(int pos, void* data);


};



static void buttonCalibrateStereo(int stat,void *data);
static void buttonReadCalib(int stat,void* data);
static void button3DReconstruct(int stat,void* data);
static void trackbarNumDispa(int pos, void* data);
static void trackbarBlockSize(int pos, void* data);
static void buttonGetRGBHistogram(int stat,void *data);

static void trackbarROIY(int pos, void* data);
static void trackbarROIX(int pos, void* data);
static void trackbarROID(int pos, void* data);



static void create_stereo_buttons(cv::String str,stereoCam *stereo){
	cv::createButton("Stop Stream",cameraJaiGo::buttonTakePicture,stereo,CV_PUSH_BUTTON,0);
	cv::createButton("Run Stream",cameraJaiGo::buttonRunStream,stereo,CV_PUSH_BUTTON,0);
	cv::createButton("Activate Software Trigger",cameraJaiGo::buttonTriggerActivation,stereo,CV_CHECKBOX,0);
	cv::createButton("Trigger",cameraJaiGo::buttonSoftwareTrigger,stereo,CV_PUSH_BUTTON,0);

	cv::createButton("Stereo Calibrate",buttonCalibrateStereo,stereo,CV_PUSH_BUTTON,0);
	cv::createButton("Read Calib from File",buttonReadCalib,stereo,CV_PUSH_BUTTON,0);
	cv::createButton("3D Reconstruct",button3DReconstruct,stereo,CV_PUSH_BUTTON,0);
	stereo->num_dispa=160;
	stereo->blocksize=17;
	cv::createTrackbar("Blocksize Stereo ","", &stereo->blocksize, 480, NULL);
	cv::createTrackbar("Number Disparity Stereo ","", &stereo->num_dispa, 480, NULL);

	stereo->num_x=1000;
	stereo->num_y=840;
	stereo->num_d=500;
	cv::createButton("Histogram",buttonGetRGBHistogram,stereo,CV_CHECKBOX,0);
	cv::createTrackbar("ROI X ","", &stereo->num_x,2560, NULL);
	cv::createTrackbar("ROI Y ","", &stereo->num_y, 2048, NULL);
	cv::createTrackbar("ROI D","", &stereo->num_d, 1000, NULL);


}
static void button3DReconstruct(int stat,void* data){
	stereoCam *stereo = (stereoCam*) data;
	stereo->reconstruct_3d=true;
	arv_camera_stop_acquisition(stereo->camera1);
	arv_camera_stop_acquisition(stereo->camera2);
}

static void buttonReadCalib(int stat,void* data){
	stereoCam* stereo = (stereoCam*)data;
	cv::FileStorage file("/home/efremg/GigE_JAI/stereoCalibrationData.xml", cv::FileStorage::READ);
	file["map_1_cam1"]>>stereo->map11;
	file["map_2_cam1"]>>stereo->map12;
	file["map_1_cam2"]>>stereo->map21;
	file["map_2_cam2"]>>stereo->map22;
	stereo->stereo_calibration_finished=true;
}

static void buttonCalibrateStereo(int stat,void *data){
	stereoCam* stereo = (stereoCam*)data;
	cv::Mat image_cam1,image_cam2;
	image_cam1 = stereo->cam1_image;
	image_cam2 = stereo->cam2_image;

	static std::vector<std::vector<cv::Point2f> > imagePoints1;
	static std::vector<std::vector<cv::Point2f> > imagePoints2;
	static std::vector<std::vector<cv::Point3f> > objectPoints(1);
	static cv::Mat cameraMatrix1, distCoeffs1, map11, map21;
	static cv::Mat cameraMatrix2, distCoeffs2, map12, map22;
	static cv::Size imageSize, patternSize;
	static std::vector<cv::Point2f> corners1,corners2;
	static bool flagFirstStereo=true;

	static int counterImages;



	cv::Mat rot,trans,fund,essent;

	stereo->stereo_calibration_finished=false;

	if(flagFirstStereo){
		cameraMatrix1 = (cv::Mat_<double>(3,3) << 1200, 0, 1280, 0, 1200, 1024, 0, 0, 1);
		cameraMatrix2 = (cv::Mat_<double>(3,3) << 1200, 0, 1280, 0, 1200, 1024, 0, 0, 1);
		counterImages=0;
		patternSize=cv::Size(9,6);
		objectPoints.clear();

		std::vector<cv::Point3f> knownBoardPositions;
		int cornerSpacingM = 65; //Spacing of corners in mm
		for(int i = 0; i < patternSize.height; ++i){
			for(int j = 0; j < patternSize.width; ++j){
				knownBoardPositions.push_back(cv::Point3f(j*cornerSpacingM, i*cornerSpacingM, 0));
			}
		}
		objectPoints.push_back(knownBoardPositions);
		flagFirstStereo=false;
	}

	if(!image_cam2.empty() && !image_cam1.empty()){

			cv::cvtColor(image_cam1,image_cam1,cv::COLOR_BayerGB2GRAY);
			cv::cvtColor(image_cam2,image_cam2,cv::COLOR_BayerGB2GRAY);
			//bool found1 = cv::findChessboardCorners(rgb, patternSize, corners, cv::CALIB_CB_ADAPTIVE_THRESH | cv::CALIB_CB_NORMALIZE_IMAGE | cv::CALIB_CB_FAST_CHECK);
			bool found1 = cv::findChessboardCorners(image_cam1, patternSize, corners1, cv::CALIB_CB_ADAPTIVE_THRESH | cv::CALIB_CB_NORMALIZE_IMAGE | cv::CALIB_CB_FAST_CHECK);
			bool found2 = cv::findChessboardCorners(image_cam2, patternSize, corners2, cv::CALIB_CB_ADAPTIVE_THRESH | cv::CALIB_CB_NORMALIZE_IMAGE | cv::CALIB_CB_FAST_CHECK);

			if (found1 && found2){
				cv::cornerSubPix(image_cam1, corners1, cv::Size(11,11), cv::Size(-1,-1), cv::TermCriteria(cv::TermCriteria::EPS+cv::TermCriteria::COUNT, 30, 0.1));
				imagePoints1.push_back(corners1);
				cv::cornerSubPix(image_cam2, corners2, cv::Size(11,11), cv::Size(-1,-1), cv::TermCriteria(cv::TermCriteria::EPS+cv::TermCriteria::COUNT, 30, 0.1));
				imagePoints2.push_back(corners2);

				objectPoints.resize(imagePoints1.size(),objectPoints[0]);

				cv::Mat tmp1,tmp2,tmp3,rvecs,tvecs;
				cv::Mat tmp11,tmp12,tmp13,rvecs1,tvecs1;


				double calibrationError1 = cv::calibrateCamera(objectPoints, imagePoints1, image_cam1.size(), cameraMatrix1, distCoeffs1, rvecs, tvecs,tmp1,tmp2,tmp3,cv::CALIB_USE_INTRINSIC_GUESS);
				double calibrationError2 = cv::calibrateCamera(objectPoints, imagePoints2, image_cam2.size(), cameraMatrix2, distCoeffs2, rvecs1, tvecs1,tmp11,tmp12,tmp13,cv::CALIB_USE_INTRINSIC_GUESS);

				std::stringstream ss;
				ss << std::fixed << std::setprecision(2) << calibrationError1;

				std::cout<<std::endl<<"Good image for calibration"<<std::endl;
				std::cout<<"Calib Error Cam1:   "<< calibrationError1<<std::endl;;
				std::cout<<"Calib Error Cam2:   "<< calibrationError2<<std::endl;

				double rms_stereo = cv::stereoCalibrate(objectPoints,imagePoints1,imagePoints2,cameraMatrix1,distCoeffs1,cameraMatrix2,distCoeffs2,image_cam1.size(),rot,trans,essent,fund);

				std::cout<<"Error Stereo:   "<<rms_stereo<<std::endl;
				//std::cout<<"Rotation    "<<std::endl<<rot<<std::endl;
				//std::cout<<std::endl<<"Translation      "<<std::endl<<trans<<std::endl;
				std::cout<<"Cam1:   "<<std::endl<<cameraMatrix1<<std::endl;
				std::cout<<"Cam2:   "<<std::endl<<cameraMatrix2<<std::endl;

				counterImages++;
				std::ostringstream tmp;
				tmp <<counterImages;


				cv::imwrite("/home/efremg/GigE_JAI/image_cam1__"+tmp.str()+".png",image_cam1);
				cv::imwrite("/home/efremg/GigE_JAI/image_cam2__"+tmp.str()+".png",image_cam2);

			}else{
				std::cout<<"BAD image for calibration  - Pattern should be to see good on both images. Take a new one!"<<std::endl;

			}


			if(imagePoints1.size()>=12){
				std::cout<<std::endl<<std::endl<<std::endl<<"calibration finished"<<std::endl<<std::endl<<std::endl;
				std::cout<<"Rotation    "<<std::endl<<rot<<std::endl;
				std::cout<<"Translation      "<<std::endl<<trans<<std::endl;

				double rms_stereo = cv::stereoCalibrate(objectPoints,imagePoints1,imagePoints2,cameraMatrix1,distCoeffs1,cameraMatrix2,distCoeffs2,image_cam1.size(),rot,trans,essent,fund);
				cv::Mat R1,R2,P1,P2,Q;
				cv::stereoRectify(cameraMatrix1,distCoeffs1,cameraMatrix2,distCoeffs2,image_cam1.size(),rot,trans,R1,R2,P1,P2,Q);


				cv::initUndistortRectifyMap(cameraMatrix1,distCoeffs1,R1,P1,image_cam1.size(),CV_16SC2, map11, map12);
				cv::initUndistortRectifyMap(cameraMatrix2,distCoeffs2,R2,P2,image_cam1.size(),CV_16SC2, map21, map22);

				std::string outputFile = "/home/efremg/GigE_JAI/stereoCalibrationData.xml";
				cv::FileStorage fs(outputFile, cv::FileStorage::WRITE);


				fs << "camera_matrix_cam1" << cameraMatrix1;
				fs << "distortion_coefficients_cam1" << distCoeffs1;
				fs << "map_1_cam1" << map11;
				fs << "map_2_cam1" << map12;
				fs << "camera_matrix_cam2" << cameraMatrix2;
				fs << "distortion_coefficients_cam2" << distCoeffs2;
				fs << "map_1_cam2" << map21;
				fs << "map_2_cam2" << map22;
				fs << "Rotation" << rot;
				fs << "Translation" << trans;

				stereo->stereo_calibration_finished=true;
				stereo->map11=map11;
				stereo->map12=map12;
				stereo->map21=map21;
				stereo->map22=map22;


			}


		}else std::cout<<"Image empty";
}


static void buttonGetRGBHistogram(int stat,void *data){
	stereoCam* stereo = (stereoCam*)data;
	if(stat)
		stereo->show_histogram=true;
	else
		stereo->show_histogram=false;


}

static void showHistogram(cv::Mat *tmp,stereoCam stereo){
	//cv::Mat* tmp = (cv::Mat*) data;
	int window_width=1000,window_heigth=260;
	int counter=0;
	int disp=stereo.num_d;
	int min_x=stereo.num_x;
	int y=stereo.num_y;
	int shift = (tmp->cols/2)+disp;
	int max_x=min_x+(window_width/2);

	cv::Mat plot = cv::Mat(window_heigth,window_width/2,CV_8UC3,cv::Scalar(0,0,0));
	for(int i=min_x;i<max_x;i+=1){
		plot.at<cv::Vec3b>(window_heigth-tmp->at<unsigned char>(y,i),counter)[2]=(unsigned char)255;
		counter+=1;
	}
	counter=0;
	for(int i=min_x+shift;i<max_x+shift;i+=1){
		plot.at<cv::Vec3b>(window_heigth-tmp->at<unsigned char>(y,i),counter)[1]=(unsigned char)255;
		counter+=1;
	}


	cv::namedWindow("plot",cv::WINDOW_NORMAL);
	cv::imshow("plot",plot);
	//cv::vconcat(*tmp,plot,*tmp);
}


#endif /* CAMERAJAIGO_H_ */
