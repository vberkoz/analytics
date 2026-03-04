package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
)

var db *dynamodb.DynamoDB
var tableName string

func init() {
	sess := session.Must(session.NewSession())
	db = dynamodb.New(sess)
	tableName = os.Getenv("TABLE_NAME")
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	headers := map[string]string{
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "GET,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	}

	projectID := request.QueryStringParameters["project_id"]
	startDate := request.QueryStringParameters["start"]
	endDate := request.QueryStringParameters["end"]

	if projectID == "" {
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       `{"error":"project_id required"}`,
		}, nil
	}

	start, _ := time.Parse("2006-01-02", startDate)
	end, _ := time.Parse("2006-01-02", endDate)
	if end.IsZero() {
		end = time.Now()
	}
	if start.IsZero() {
		start = end.AddDate(0, 0, -7)
	}

	var allEvents []map[string]interface{}

	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		pk := fmt.Sprintf("%s#%s", projectID, d.Format("2006-01-02"))

		result, err := db.Query(&dynamodb.QueryInput{
			TableName:              aws.String(tableName),
			KeyConditionExpression: aws.String("pk = :pk"),
			ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
				":pk": {S: aws.String(pk)},
			},
		})

		if err != nil {
			continue
		}

		for _, item := range result.Items {
			event := map[string]interface{}{
				"sk":         *item["sk"].S,
				"event_type": *item["event_type"].S,
				"path":       *item["path"].S,
				"screen":     *item["screen"].S,
			}
			if item["referrer"] != nil && item["referrer"].S != nil {
				event["referrer"] = *item["referrer"].S
			}
			allEvents = append(allEvents, event)
		}
	}

	response := map[string]interface{}{
		"events": allEvents,
	}

	body, _ := json.Marshal(response)

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    headers,
		Body:       string(body),
	}, nil
}

func main() {
	lambda.Start(handler)
}
