/*
 * gui.cpp
 *
 *  Created on: 14.02.2017
 *      Author: efrem
 */



#include <opencv2/calib3d.hpp>

#include "cameraJaiGo.h"


int main(){
	ArvCamera *camera1,*camera2,*tmpcam;

	arv_update_device_list();
	const char* deviceId1 = arv_get_device_id(0);
	const char* deviceId2 = arv_get_device_id(1);


	camera2=arv_camera_new(deviceId2);
	camera1=arv_camera_new(deviceId1);

	if(camera1==NULL){
		printf("No available camera");
		return 0;
	}
	if(camera2==NULL){
		printf("No available second camera");
		return 0;
	}


	cv::Mat cameraMatrix,distCoeffs;

	cameraJaiGo  cam2(camera2,"cam2"),cam1(camera1,"cam1");
	stereoCam stereo;

	stereo.camera1=camera1;
	stereo.camera2=camera2;
	stereo.stereo_calibration_finished=false;
	stereo.reconstruct_3d=false;



	cam2.config_camera();
	cam2.create_window("right");

	cam1.config_camera();
	cam1.create_window("left");
	arv_camera_start_acquisition(cam2.camera);
	arv_camera_start_acquisition(cam1.camera);
	cv::Mat test;
	create_stereo_buttons("test",&stereo);


	printf("%s       %s",arv_camera_get_device_id(cam1.camera),arv_camera_get_device_id(cam2.camera));
	cv::Mat remap1,remap2;
	cv::Mat disp=cv::Mat(cam1.bayerFrame.rows, cam1.bayerFrame.cols, CV_8UC1,1);
	while(cv::waitKey(1)!=27){

		cam1.loop();
		if(cam1.newFrameFromCb && !cam1.flag_test){
			cv::cvtColor(cam1.bayerFrame,remap1,cv::COLOR_BayerGB2GRAY);
			if(stereo.stereo_calibration_finished){
				remap(remap1, remap1, stereo.map11,stereo.map12, cv::INTER_LINEAR);
			}
			cv::imshow("cam1",remap1);
			cam1.newFrameFromCb = false;

		}
		cam2.loop();
		if(cam2.newFrameFromCb && !cam2.flag_test){
			cv::cvtColor(cam2.bayerFrame,remap2,cv::COLOR_BayerGB2GRAY);
			if(stereo.stereo_calibration_finished){
				remap(remap2, remap2, stereo.map21,stereo.map22, cv::INTER_LINEAR);
			}
			cv::imshow("cam2",remap2);
			cam2.newFrameFromCb=false;
		}
		if(!remap1.empty() && !remap2.empty()){
			cv::Mat dst;
			cv::hconcat(remap2,remap1,dst);
			cv::namedWindow("merge",cv::WINDOW_NORMAL);
			cv::imshow("merge",dst);
		}
		if(cam1.flag_test || cam2.flag_test){
			cv::waitKey(500);
			cam1.flag_test=false;
			cam2.flag_test=false;
		}
		stereo.cam1_image=cam1.bayerFrame;
		stereo.cam2_image=cam2.bayerFrame;

		if(stereo.reconstruct_3d){
				cv::Mat cam1im,cam2im;
				cv::cvtColor(cam1.bayerFrame,cam1im,cv::COLOR_BayerGB2GRAY);
				cv::cvtColor(cam2.bayerFrame,cam2im,cv::COLOR_BayerGB2GRAY);

				remap(cam1im, cam1im, stereo.map11,stereo.map12, cv::INTER_LINEAR);
				remap(cam2im, cam2im, stereo.map21,stereo.map22, cv::INTER_LINEAR);
				cv::Ptr<cv::StereoSGBM> bm= cv::StereoSGBM::create(0,0,0);
				cv::Mat dispa;

				bm->setNumDisparities(stereo.num_dispa);
				bm->setBlockSize(stereo.blocksize);

				bm->compute(cam2im,cam1im,dispa);


				cv::normalize(dispa,disp,0.1,255,CV_MINMAX,CV_8U);

				cv::namedWindow("Tiefendaten",cv::WINDOW_NORMAL);
				cv::imshow("Tiefendaten",disp);
				stereo.reconstruct_3d=false;

				arv_camera_start_acquisition(stereo.camera1);
				arv_camera_start_acquisition(stereo.camera2);

			}

	}


	g_object_unref(camera1);
	g_object_unref(camera2);


	return 0;
}


